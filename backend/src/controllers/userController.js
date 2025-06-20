/**
 * Controller de Usuários
 * Objetivos: CRUD completo de usuários com controle de acesso e auditoria
 * Baseado no planejamento: /api/users com paginação e filtros
 * 
 * REESTRUTURADO: Agora usa userService para funcionalidades avançadas e análises
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const userService = require('../services/userService');

/**
 * @desc    Listar usuários (paginado com filtros)
 * @route   GET /api/users
 * @access  Private (Admin/Operator)
 */
const getUsers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = '-createdAt',
    search,
    role,
    isActive,
    includeAnalytics = 'false',
    includeInactivity = 'false'
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (role) {
    filter.role = role;
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  // 2. Configurar paginação
  const skip = (page - 1) * limit;
  const sortObj = {};
  
  // Parse do sort
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // 3. Executar consulta com paginação
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -passwordChangedAt')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    User.countDocuments(filter)
  ]);

  // 4. Adicionar análises avançadas se solicitado
  let usersWithAnalytics = users;
  
  if (includeAnalytics === 'true') {
    // Usar userService para adicionar análises de produtividade
    usersWithAnalytics = await Promise.all(
      users.map(async (user) => {
        try {
          const userActivity = await userService.analyzeUserActivity(user._id, {
            timeframe: '7d',
            includeDetails: false
          });
          
          return {
            ...user.toObject(),
            analytics: {
              productivityScore: userActivity.data.productivity.overallScore,
              productivityLevel: userActivity.data.productivity.level,
              totalMovements: userActivity.data.summary.totalMovements,
              locationsUsed: userActivity.data.summary.locationsUsed,
              lastAnalysis: userActivity.data.analyzedAt
            }
          };
        } catch (error) {
          console.warn(`Erro ao processar usuário ${user._id} para analytics:`, error.message);
          // Retornar objeto básico de usuário para prevenir crash
          try {
            return {
              ...user.toObject(),
              analytics: null
            };
          } catch (toObjectError) {
            console.warn(`Erro crítico ao serializar usuário ${user._id}:`, toObjectError.message);
            // Fallback seguro se até toObject() falhar
            return {
              _id: user._id,
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              analytics: null
            };
          }
        }
      })
    );
  } else {
    // Mesmo quando não incluir analytics, proteger contra falhas de toObject()
    usersWithAnalytics = users.map(user => {
      try {
        return user.toObject();
      } catch (error) {
        console.warn(`Erro ao serializar usuário ${user._id}:`, error.message);
        // Fallback seguro
        return {
          _id: user._id,
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
      }
    });
  }

  // 5. Detectar usuários inativos se solicitado
  let inactivityData = null;
  if (includeInactivity === 'true') {
    try {
      const inactiveUsersResult = await userService.detectInactiveUsers({
        timeframe: '30d',
        threshold: 7,
        includeAnalysis: true
      });
      
      inactivityData = inactiveUsersResult.data;
    } catch (error) {
      console.warn('Erro ao detectar usuários inativos:', error.message);
    }
  }

  // 6. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 7. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      users: usersWithAnalytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      analytics: includeAnalytics === 'true' ? {
        enabled: true,
        timeframe: '7d'
      } : null,
      inactivity: inactivityData
    }
  });
});

/**
 * @desc    Obter usuário específico
 * @route   GET /api/users/:id
 * @access  Private (Admin/Own User)
 */
const getUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { includeActivity = 'false', timeframe = '30d' } = req.query;

  // 1. Buscar usuário
  const user = await User.findById(id).select('-password -passwordChangedAt');

  if (!user) {
    return next(new AppError('Usuário não encontrado', 404));
  }

  // 2. Middleware canAccessUser já validou permissões - continuar direto

  // 3. Adicionar análise de atividade se solicitado
  let activityAnalysis = null;
  if (includeActivity === 'true') {
    try {
      const activityResult = await userService.analyzeUserActivity(id, {
        timeframe,
        includeDetails: true
      });
      
      activityAnalysis = activityResult.data;
    } catch (error) {
      console.warn('Erro ao analisar atividade do usuário:', error.message);
    }
  }

  // 4. Gerar sugestões de role se admin estiver visualizando
  let roleSuggestions = null;
  if (req.user.isAdmin() && req.user._id.toString() !== id) {
    try {
      const roleResult = await userService.suggestRoleChanges(id, {
        analysisTimeframe: '60d',
        minActivityThreshold: 10
      });
      
      roleSuggestions = roleResult.data;
    } catch (error) {
      console.warn('Erro ao gerar sugestões de role:', error.message);
    }
  }

  // 5. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      activity: activityAnalysis,
      roleSuggestions: roleSuggestions
    }
  });
});

/**
 * @desc    Criar novo usuário
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
const createUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // 1. Validar campos obrigatórios
  if (!name || !email || !password) {
    return next(new AppError('Nome, email e senha são obrigatórios', 400));
  }

  // 2. Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Formato de email válido é obrigatório', 400));
  }

  // 3. Validar tamanho mínimo da senha
  if (password.length < 6) {
    return next(new AppError('A senha deve ter pelo menos 6 caracteres', 400));
  }

  // 4. Validar role se fornecido
  const validRoles = ['ADMIN', 'OPERATOR']; // Usar maiúsculas conforme modelo
  // Se role for fornecido, validar contra os valores corretos em maiúsculas
  if (role && !validRoles.includes(role)) {
    return next(new AppError('Role inválido. Valores permitidos: ADMIN ou OPERATOR', 400));
  }

  // 5. Verificar se usuário já existe
  const existingUser = await User.findByEmail(email);
  
  if (existingUser) {
    return next(new AppError('Usuário com este email já existe', 400));
  }

  // 6. Criar usuário
  const userData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    // Usar role diretamente se fornecido e válido, sem conversão para minúsculas
    ...(role && { role: role })
  };

  const newUser = await User.create(userData);

  // 7. Usar userService para registrar atividade de criação
  try {
    await userService.analyzeUserActivity(req.user._id, {
      timeframe: '1d',
      includeDetails: false
    });
  } catch (error) {
    console.warn('Erro ao registrar atividade de criação:', error.message);
  }

  // 8. Remover senha da resposta
  newUser.password = undefined;

  // 9. Resposta de sucesso
  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    }
  });
});

/**
 * @desc    Atualizar usuário
 * @route   PUT /api/users/:id
 * @access  Private (Admin/Own User)
 */
const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, role, isActive } = req.body;

  // 1. Verificar se usuário existe
  const user = await User.findById(id);
  
  if (!user) {
    return next(new AppError('Usuário não encontrado', 404));
  }

  // 2. Validar formato de email se fornecido
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Formato de email válido é obrigatório', 400));
    }
  }

  // 3. Validar role se fornecido
  const validRoles = ['ADMIN', 'OPERATOR']; // Usar maiúsculas conforme modelo
  // Se role for fornecido, validar contra os valores corretos em maiúsculas
  if (role && !validRoles.includes(role)) {
    return next(new AppError('Role inválido. Valores permitidos: ADMIN ou OPERATOR', 400));
  }

  // 4. Verificar se email será alterado e se já existe
  if (email && email.toLowerCase() !== user.email) {
    const existingUser = await User.findByEmail(email);
    
    if (existingUser) {
      return next(new AppError('Email já está em uso por outro usuário', 400));
    }
  }

  // 5. Preparar dados para atualização
  const updateData = {};
  
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.toLowerCase().trim();
  if (role) updateData.role = role; // Usar role diretamente se fornecido e válido
  if (isActive !== undefined) updateData.isActive = isActive;

  // 6. Atualizar usuário
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  }).select('-password -passwordChangedAt');

  // 7. Gerar análise pós-atualização se role foi alterado
  let roleAnalysis = null;
  if (role && role !== user.role) {
    try {
      const roleResult = await userService.suggestRoleChanges(id, {
        analysisTimeframe: '30d'
      });
      
      roleAnalysis = {
        previousRole: user.role,
        newRole: role,
        adequacy: roleResult.data.analysis.roleAdequacy,
        confidence: roleResult.data.confidence
      };
    } catch (error) {
      console.warn('Erro ao analisar mudança de role:', error.message);
    }
  }

  // 8. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Usuário atualizado com sucesso',
    data: {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      },
      roleAnalysis
    }
  });
});

/**
 * @desc    Desativar usuário
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1. Verificar se usuário existe
  const user = await User.findById(id);
  
  if (!user) {
    return next(new AppError('Usuário não encontrado', 404));
  }

  // 2. Não permitir auto-exclusão
  if (req.user._id.toString() === id) {
    return next(new AppError('Não é possível desativar sua própria conta', 400));
  }

  // 3. Gerar relatório de atividade antes da desativação
  let finalActivityReport = null;
  try {
    const activityResult = await userService.generateUserProductivityReport(id, {
      timeframe: '90d',
      includeComparison: true,
      includePredictions: false
    });
    
    finalActivityReport = activityResult.data;
  } catch (error) {
    console.warn('Erro ao gerar relatório final:', error.message);
  }

  // 4. Desativar usuário (soft delete)
  const deactivatedUser = await User.findByIdAndUpdate(
    id, 
    { isActive: false },
    { new: true }
  ).select('-password -passwordChangedAt');

  // 5. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Usuário desativado com sucesso',
    data: {
      user: {
        id: deactivatedUser._id,
        name: deactivatedUser.name,
        email: deactivatedUser.email,
        role: deactivatedUser.role,
        isActive: deactivatedUser.isActive,
        updatedAt: deactivatedUser.updatedAt
      },
      finalReport: finalActivityReport
    }
  });
});

/**
 * @desc    Obter análise de produtividade de usuário
 * @route   GET /api/users/:id/productivity
 * @access  Private (Admin/Own User)
 */
const getUserProductivity = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { timeframe = '30d', includeComparison = 'true' } = req.query;

  // 1. Middleware canAccessUser já validou permissões - continuar direto

  // 2. Gerar relatório de produtividade usando userService
  try {
    const productivityResult = await userService.generateUserProductivityReport(id, {
      timeframe,
      includeComparison: includeComparison === 'true',
      includePredictions: true,
      includeRecommendations: true
    });

    res.status(200).json({
      success: true,
      data: productivityResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro ao gerar relatório de produtividade: ${error.message}`, 500));
  }
});

/**
 * @desc    Obter usuários similares
 * @route   GET /api/users/:id/similar
 * @access  Private (Admin only)
 */
const getSimilarUsers = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { minSimilarity = '70' } = req.query;

  try {
    const similarUsersResult = await userService.findUsersWithSimilarPatterns(id, {
      minSimilarity: parseInt(minSimilarity),
      includeDetails: true,
      timeframe: '60d'
    });

    res.status(200).json({
      success: true,
      data: similarUsersResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro ao encontrar usuários similares: ${error.message}`, 500));
  }
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProductivity,
  getSimilarUsers
}; 
export const APP_CONFIG = {
  // Backend configuration
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // Development options
  USE_MOCK_DATA: process.env.REACT_APP_USE_MOCK === 'true' || false,
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  
  // UI settings
  DEBOUNCE_DELAY: 300,
  
  // Feature flags
  FEATURES: {
    ENABLE_3D_MAP: true,
    ENABLE_REPORTS: true,
    ENABLE_NOTIFICATIONS: true,
  }
};

export default APP_CONFIG; 
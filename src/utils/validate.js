const validateRequest = (requiredFields, body) => {
    for (const field of requiredFields) {
      if (!body[field]) {
        return `${field} is required.`;
      }
    }
    return null;
  };
  
  module.exports = { validateRequest };
  
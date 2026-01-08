const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

// Register Handlebars helpers for better template support
Handlebars.registerHelper('if', function(condition, options) {
  if (arguments.length < 2) {
    throw new Error('Handlebars helper "if" needs 1 parameter');
  }
  if (typeof condition === 'function') {
    condition = condition.call(this);
  }
  
  // Handle array length checks
  if (Array.isArray(condition) && condition.length > 0) {
    return options.fn(this);
  }
  // Handle truthy values
  if (condition) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

Handlebars.registerHelper('each', function(context, options) {
  let ret = '';
  if (context && Array.isArray(context) && context.length > 0) {
    for (let i = 0; i < context.length; i++) {
      ret += options.fn(context[i], { data: { index: i, first: i === 0, last: i === context.length - 1 } });
    }
  }
  return ret;
});

/**
 * Load and compile a resume template
 * @param {string} templateId - 'classic' or 'modern'
 * @returns {HandlebarsTemplateDelegate} Compiled template
 */
function loadTemplate(templateId) {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateId}.html`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template ${templateId} not found`);
  }
  
  const templateContent = fs.readFileSync(templatePath, 'utf8');
  return Handlebars.compile(templateContent);
}

/**
 * Render resume HTML from data
 * @param {string} templateId - 'classic' or 'modern'
 * @param {Object} data - Resume data
 * @returns {string} Rendered HTML
 */
function renderResume(templateId, data) {
  const template = loadTemplate(templateId);
  return template(data);
}

/**
 * Get available template IDs
 * @returns {string[]} Array of template IDs
 */
function getAvailableTemplates() {
  const templatesDir = path.join(__dirname, '..', 'templates');
  if (!fs.existsSync(templatesDir)) {
    return [];
  }
  
  return fs.readdirSync(templatesDir)
    .filter(file => file.endsWith('.html'))
    .map(file => file.replace('.html', ''));
}

module.exports = {
  loadTemplate,
  renderResume,
  getAvailableTemplates
};


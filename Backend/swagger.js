const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const YAML = require('yaml');

const baseDocument = YAML.parse(
    fs.readFileSync(path.join(__dirname, 'swagger.yaml'), 'utf8')
);

module.exports = swaggerJsdoc({
    definition: baseDocument,
    apis: [
        path.join(__dirname, 'index.js'),
        path.join(__dirname, 'routes/**/*.js')
    ]
});

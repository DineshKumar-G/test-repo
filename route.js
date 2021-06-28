const Router = require('express').Router();
const Service = require('./services/pdfGenerator');

Router.get('/', Service.getSearchResults, Service.generateReport);

module.exports = Router;

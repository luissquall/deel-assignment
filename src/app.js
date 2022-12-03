const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')()
const {sequelize} = require('./model')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
app.use(pino)

app.use('/contracts', require('./routes/contracts'))
app.use('/jobs', require('./routes/jobs'))
app.use('/balances', require('./routes/balances'))

module.exports = app;

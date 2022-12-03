const express = require('express');
const bodyParser = require('body-parser');
const pino = require('express-pino-logger')()
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
app.use(pino)

/**
 * Return a contract by id
 *
 * It should return the contract only if it belongs to the profile calling
 *
 * @returns contract
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const { Op } = require('sequelize');
    const {Contract} = req.app.get('models')
    const {id} = req.params
    // We could have found the contract, even if it was not associated to the profile calling,
    // and then thrown an unauthorized error. I decided not using that strategy to avoid hinting the
    // existence of records that don't belong to you
    const contract = await Contract.findOne({
        where: {
            id,
            [Op.or]: [
                { ContractorId: req.profile.id },
                { ClientId: req.profile.id }
            ]
        }
    })

    if(!contract) return res.status(404).end()
    res.json(contract)
})
module.exports = app;

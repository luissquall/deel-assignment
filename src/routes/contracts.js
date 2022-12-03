const express = require('express')
const router = express.Router()
const { getProfile } = require('../middleware/getProfile')
const { Op } = require('sequelize')

/**
 * Returns a list of contracts
 *
 * The list should only contain non terminated contracts
 *
 * @returns contracts
 */
router.get('/', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const contracts = await Contract.findAll({
        where: {
            status: {
                [Op.ne]: 'terminated'
            },
            [Op.or]: [
                { ContractorId: req.profile.id },
                { ClientId: req.profile.id }
            ]
        }
    })

    res.json(contracts)
})

/**
 * Return a contract by id
 *
 * It should return the contract only if it belongs to the profile calling
 *
 * @returns contract
 */
router.get('/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
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

    if (!contract) return res.status(404).end()
    res.json(contract)
})

module.exports = router

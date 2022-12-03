const express = require('express')
const router = express.Router()
const { getProfile } = require('../middleware/getProfile')
const { Op } = require('sequelize')

/**
 * Get all unpaid jobs for a user, for active contracts only
 *
 * @returns jobs
 */
router.get('/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const jobs = await Job.findAll({
        where: {
            paid: {
                [Op.not]: true
            },
            '$Contract.status$': 'in_progress',
            [Op.or]: [
                { '$Contract.ContractorId$': req.profile.id },
                { '$Contract.ClientId$': req.profile.id }
            ]
        },
        include: Contract
    })

    res.json(jobs)
})

module.exports = router

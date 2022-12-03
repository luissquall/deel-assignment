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

/**
 * Pay for a job
 *
 * @returns job
 */
router.post('/:id/pay', getProfile, async (req, res) => {
    const sequelize = req.app.get('sequelize');
    const { Job, Contract, Profile } = req.app.get('models')
    const { id } = req.params
    const payment = req.body;

    if (req.profile.type != 'client') {
        return res.status(401).send({ error: 'Only clients are allowed to pay'})
    }

    let result;

    try {
        result = await sequelize.transaction(async (t) => {
            const job = await Job.findOne({
                where: { id },
                include: Contract,
                transaction: t
            })

            if (job.paid) {
                throw new Error('This job has been already paid')
            }

            if (job.Contract.ClientId != req.profile.id) {
                throw new Error('You are not allowed to pay for this job')
            }

            if (payment.amount != job.price) {
                throw new Error('Your amount should be the same as the job price')
            }

            const client = await Profile.findOne({
                where: { id: req.profile.id },
                transaction: t
            })

            if (client.balance - payment.amount < 0) {
                throw new Error('Insufficent funds')
            }

            const contractor = await Profile.findOne({
                where: { id: job.Contract.ContractorId },
                transaction: t
            })

            await client.decrement('balance', {
                by: payment.amount,
                transaction: t
            })

            await contractor.increment('balance', {
                by: payment.amount,
                transaction: t
            })

            job.paid = true;
            job.paymentDate = new Date().toISOString();

            await job.save({
                transaction: t
            });

            return job;
        });
    } catch (error) {
        // If the execution reaches this line, an error occurred.
        // The transaction has already been rolled back automatically by Sequelize
        return res.status(400).send({ error: error.message })
    }

    res.json(result)
})

module.exports = router

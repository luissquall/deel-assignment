const express = require('express')
const router = express.Router()
const { getProfile } = require('../middleware/getProfile')
const { Op } = require('sequelize')

/**
 * Deposit money into the balance of a client
 *
 * @returns balance
 */
router.post('/deposit/:userId/', getProfile, async (req, res) => {
    const sequelize = req.app.get('sequelize');
    const { Job, Contract, Profile } = req.app.get('models')
    const { userId } = req.params
    const payment = req.body

    let result;

    try {
        result = await sequelize.transaction(async (t) => {
            const client = await Profile.findOne({
                where: { id: userId, type: 'client' },
                transaction: t
            })

            if (!client) {
                throw new Error('Client not found')
            }

            const balanceDue = await Job.sum('price', {
                where: {
                    '$Contract.ClientId$': userId,
                    paid: {
                        [Op.not]: true
                    }
                 },
                include: Contract
            })
            const amountLimit = balanceDue * .25

            if (payment.amount > amountLimit) {
                throw new Error('You can’t deposit more than 25% your total of jobs to pay')
            }

            const balance = {
                previousBalance: client.balance,
                balance: client.balance + payment.amount
            }

            await client.increment('balance', {
                by: payment.amount,
                transaction: t
            })

            return balance;
        });
    } catch (error) {
        // If the execution reaches this line, an error occurred.
        // The transaction has already been rolled back automatically by Sequelize
        return res.status(400).send({ error: error.message })
    }

    res.json(result)
})

module.exports = router

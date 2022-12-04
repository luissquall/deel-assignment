const express = require('express')
const router = express.Router()
const { getProfile } = require('../middleware/getProfile')
const { Op } = require('sequelize')
const { query, validationResult } = require('express-validator');

/**
 * Returns that clients the paid the most for jobs in the query time period
 *
 * @returns clients
 */
router.get(
    '/best-clients',
    query('start').optional().isDate(),
    query('end').optional().isDate(),
    query('limit').optional().isInt(),
    getProfile,
    async (req, res) => {
        const sequelize = require('sequelize');
        const { Job, Contract, Profile } = req.app.get('models')
        const start = req.query.start;
        const end = req.query.end;
        const limit = req.query.limit ?? 2;
        const where = {
            paid: true
        };

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        if (start) {
            where.paymentDate = {
                [Op.gte]: `${start}T00:00Z`
            };
        }
        if (end) {
            let date = new Date(end);

            date.setDate(date.getDate() + 1)

            where.paymentDate = where.paymentDate ?? {};
            where.paymentDate[Op.lt] = date.toISOString();
        }

        const jobs = await Job.findAll({
            attributes: {
                include: [
                    [sequelize.fn('SUM', sequelize.col('price')), 'total']
                ]
            },
            where,
            include: [
                {
                    model: Contract,
                    required: true,
                    include: [
                        {
                            model: Profile,
                            as: 'Client'
                        }
                    ]
                }
            ],
            group: 'Contract.ClientId',
            order: [
                ['total', 'DESC']
            ],
            limit
        })
        const results = [];

        for (const job of jobs) {
            let _job = job.toJSON();

            results.push({
                id: job.Contract.Client.id,
                fullName: job.Contract.Client.firstName + ' ' + job.Contract.Client.lastName,
                paid: _job.total
            })
        }

        res.json(results)
    }
)

module.exports = router

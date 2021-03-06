const { SessionOptions } = require('@dnode/request-maxdome');

module.exports = ({ maxdome, redis }) => [
  'post',
  [
    '/linkedAccount',
    async (req, res) => {
      try {
        const accessToken = req.body.accessToken;
        if (!accessToken) {
          throw new Error('missing accessToken');
        }
        let linkedAccount = await redis.getJSON(`LINKEDACCOUNT:${accessToken}`);
        if (!linkedAccount) {
          throw new Error('incorrect accessToken');
        }
        try {
          await maxdome.post(
            'v1/auth/keepalive',
            new SessionOptions(linkedAccount)
          );
        } catch (e) {
          const data = await maxdome.post('v1/autologin_portal', {
            body: { autoLoginPin: linkedAccount.autoLoginPin },
          });
          linkedAccount = {
            autoLoginPin: data.autoLoginPin,
            customer: { customerId: data.customer.customerId },
            sessionId: data.sessionId,
          };
          await redis.setJSON(`LINKEDACCOUNT:${accessToken}`, linkedAccount);
        }
        res.status(200).send({ linkedAccount });
      } catch (e) {
        res.status(403).send();
      }
    },
  ],
];

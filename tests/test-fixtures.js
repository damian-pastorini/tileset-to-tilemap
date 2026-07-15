/**
 *
 * Reldens - TestFixtures
 *
 */

class TestFixtures
{

    static buildJsonMockRes()
    {
        let mock = {};
        mock.statusCode = null;
        mock.body = null;
        mock.status = (code) => {
            mock.statusCode = code;
            return mock;
        };
        mock.json = (data) => {
            mock.body = data;
        };
        return mock;
    }

    static buildAiRequestBody(overrides)
    {
        return Object.assign({
            sessionId: 'sess',
            imageId: 'img.png',
            provider: 'claude'
        }, overrides);
    }

    static buildAiRequestWithoutNullKeys(overrides)
    {
        let body = TestFixtures.buildAiRequestBody(overrides);
        for(let key of Object.keys(body)){
            if(null === body[key]){
                delete body[key];
            }
        }
        return {body};
    }

}

module.exports.TestFixtures = TestFixtures;

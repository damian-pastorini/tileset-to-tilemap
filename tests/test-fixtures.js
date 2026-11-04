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

    static buildElementsTileset(overrides)
    {
        return Object.assign({
            tilesetColumns: 4,
            tileRows: 4,
            tileCount: 16,
            animationsDefaultDuration: 200,
            elements: [
                {
                    name: 'water-001',
                    layers: [
                        {type: 'ground', tiles: [[0, 2], [0, 3]]},
                        {type: 'collisions', tiles: [[1, 2]]}
                    ]
                }
            ]
        }, overrides);
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

/**
 *
 * Reldens - IndexRoute
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class IndexRoute
{
    constructor(showAiControls, activeProviders, publicDir)
    {
        this.showAiControls = showAiControls ? '1' : '0';
        this.activeProviders = activeProviders ? activeProviders.join(',') : '';
        this.publicDir = publicDir || 'public';
    }

    handle(req, res)
    {
        let html = FileHandler.readFile(FileHandler.joinPaths(this.publicDir, 'index.html'));
        if(!html){
            Logger.error('IndexRoute: failed to read index.html');
            res.status(500).send('Failed to load page');
            return;
        }
        let target = '<div class="tileset-analyzer">';
        if(!html.includes(target)){
            Logger.error('IndexRoute: tileset-analyzer container not found in index.html');
            res.status(500).send('Failed to load page');
            return;
        }
        let attrs = ' data-show-ai-controls="'+this.showAiControls+'" data-active-providers="'+this.activeProviders+'"';
        res.setHeader('Content-Type', 'text/html');
        res.send(html.replace(target, '<div class="tileset-analyzer"'+attrs+'>'));
    }
}

module.exports.IndexRoute = IndexRoute;

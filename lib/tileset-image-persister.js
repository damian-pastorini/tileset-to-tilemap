/**
 *
 * Reldens - TilesetImagePersister
 *
 */

const { ROOT_DIR } = require('./utils/constants');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class TilesetImagePersister
{
    static updateTilesetPaths(tileset, oldInputDir, newInputDir, oldOutputDir, newOutputDir, oldSessionId, sessionId)
    {
        if(oldInputDir && tileset.filePath){
            tileset.filePath = tileset.filePath.split(oldInputDir).join(newInputDir);
        }
        if(oldOutputDir && tileset.filePath){
            tileset.filePath = tileset.filePath.split(oldOutputDir).join(newOutputDir);
        }
        if(oldSessionId && tileset.imageUrl){
            tileset.imageUrl = tileset.imageUrl
                .split('/tileset-image/'+oldSessionId+'/')
                .join('/tileset-image/'+sessionId+'/');
        }
    }

    static ensureTilesetCopied(tileset, inputDir, sessionId)
    {
        if(!tileset.filePath){
            return true;
        }
        let filename = FileHandler.getFileName(tileset.filePath);
        let expectedFilePath = FileHandler.joinPaths(inputDir, filename);
        if(tileset.filePath === expectedFilePath){
            return true;
        }
        FileHandler.createFolder(inputDir);
        let copied = FileHandler.copyFile(tileset.filePath, expectedFilePath);
        if(!copied){
            Logger.error('TilesetImagePersister.persistImages: '+sc.toJsonString(FileHandler.error));
            return false;
        }
        tileset.filePath = expectedFilePath;
        tileset.imageUrl = '/tileset-image/'+sessionId+'/'+filename;
        return true;
    }

    static persistImages(outputDir, sessionId, tilesets, oldInputDir, newInputDir, oldSessionId)
    {
        let inputDir = FileHandler.joinPaths(ROOT_DIR, 'input', sessionId);
        let oldOutputDir = '';
        let newOutputDir = '';
        if(oldSessionId){
            oldOutputDir = FileHandler.joinPaths(ROOT_DIR, 'output', oldSessionId);
            newOutputDir = FileHandler.joinPaths(ROOT_DIR, 'output', sessionId);
        }
        for(let tileset of tilesets){
            TilesetImagePersister.updateTilesetPaths(
                tileset,
                oldInputDir,
                newInputDir,
                oldOutputDir,
                newOutputDir,
                oldSessionId,
                sessionId
            );
            if(!TilesetImagePersister.ensureTilesetCopied(tileset, inputDir, sessionId)){
                continue;
            }
            let imageOutputPath = FileHandler.joinPaths(outputDir, tileset.imageId);
            if(!FileHandler.exists(imageOutputPath)){
                FileHandler.copyFile(tileset.filePath, imageOutputPath);
            }
            tileset.sessionId = sessionId;
        }
    }

    static updateCroppedPaths(croppedElementsPaths, oldSessionId, newSessionId)
    {
        if(!croppedElementsPaths){
            return croppedElementsPaths;
        }
        let oldFragment = '/output/'+oldSessionId+'/';
        let newFragment = '/output/'+newSessionId+'/';
        let oldFragmentWin = '\\output\\'+oldSessionId+'\\';
        let newFragmentWin = '\\output\\'+newSessionId+'\\';
        for(let tilesetFilename of Object.keys(croppedElementsPaths)){
            let tilesetPaths = croppedElementsPaths[tilesetFilename];
            for(let elementName of Object.keys(tilesetPaths)){
                tilesetPaths[elementName] = tilesetPaths[elementName]
                    .split(oldFragment).join(newFragment)
                    .split(oldFragmentWin).join(newFragmentWin);
            }
        }
        return croppedElementsPaths;
    }
}

module.exports.TilesetImagePersister = TilesetImagePersister;

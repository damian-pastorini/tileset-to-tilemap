/**
 *
 * Reldens - TilesetImagePersister
 *
 */

const sharp = require('sharp');
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

    static persistImages(rootDir, outputDir, sessionId, tilesets, oldInputDir, newInputDir, oldSessionId)
    {
        let inputDir = FileHandler.joinPaths(rootDir, 'input', sessionId);
        let oldOutputDir = '';
        let newOutputDir = '';
        if(oldSessionId){
            oldOutputDir = FileHandler.joinPaths(rootDir, 'output', oldSessionId);
            newOutputDir = FileHandler.joinPaths(rootDir, 'output', sessionId);
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

    static async loadImageBuffer(sessionId, imageId, rootDir)
    {
        let imagePath = FileHandler.joinPaths(rootDir, 'input', sessionId, imageId);
        if(!FileHandler.exists(imagePath)){
            imagePath = FileHandler.joinPaths(rootDir, 'output', sessionId, imageId);
        }
        return sharp(imagePath).png().toBuffer();
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

/**
 *
 * Reldens - TilesetImagePersister
 *
 */

const sharp = require('sharp');
const { TilesetConst } = require('./constants');
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
                .split('tileset-image/'+oldSessionId+'/')
                .join('tileset-image/'+sessionId+'/');
        }
    }

    static ensureTilesetCopied(tileset, inputDir, sessionId, tilesetSessionsDir)
    {
        let filename = tileset.imageId ? tileset.imageId : (tileset.filePath ? FileHandler.getFileName(tileset.filePath) : null);
        if(!filename){
            return true;
        }
        let expectedFilePath = FileHandler.joinPaths(inputDir, filename);
        if(FileHandler.exists(expectedFilePath)){
            tileset.filePath = expectedFilePath;
            tileset.imageUrl = 'tileset-image/'+sessionId+'/'+filename;
            return true;
        }
        if(tileset.filePath && FileHandler.exists(tileset.filePath)){
            FileHandler.createFolder(inputDir);
            let copied = FileHandler.copyFile(tileset.filePath, expectedFilePath);
            if(copied){
                tileset.filePath = expectedFilePath;
                tileset.imageUrl = 'tileset-image/'+sessionId+'/'+filename;
                return true;
            }
            Logger.error('TilesetImagePersister.ensureTilesetCopied: copy failed: '+sc.toJsonString(FileHandler.error));
        }
        if(tilesetSessionsDir){
            let foundPath = TilesetImagePersister.findImageInInputSessions(tilesetSessionsDir, filename);
            if(foundPath){
                FileHandler.createFolder(inputDir);
                FileHandler.copyFile(foundPath, expectedFilePath);
                tileset.filePath = expectedFilePath;
                tileset.imageUrl = 'tileset-image/'+sessionId+'/'+filename;
                return true;
            }
        }
        Logger.error('TilesetImagePersister.ensureTilesetCopied: source file not found: '+expectedFilePath);
        return false;
    }

    static persistImages(rootDir, outputDir, sessionId, tilesets, oldInputDir, newInputDir, oldSessionId, tilesetSessionsDir)
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
            tileset.sessionId = sessionId;
            if(!TilesetImagePersister.ensureTilesetCopied(tileset, inputDir, sessionId, tilesetSessionsDir)){
                continue;
            }
            let bufferDir = FileHandler.joinPaths(outputDir, TilesetConst.OUTPUT_AI_BUFFER_SUB_FOLDER);
            FileHandler.createFolder(bufferDir);
            let imageOutputPath = FileHandler.joinPaths(bufferDir, tileset.imageId);
            if(!FileHandler.exists(imageOutputPath)){
                FileHandler.copyFile(tileset.filePath, imageOutputPath);
            }
        }
    }

    static ensureOutputImages(rootFolder, sessionId, tilesetSessionsDir)
    {
        let statePath = FileHandler.joinPaths(rootFolder, 'session-editor-state.json');
        if(!FileHandler.exists(statePath)){
            return;
        }
        let state = FileHandler.fetchFileJson(statePath);
        if(!state || !state.tilesets){
            return;
        }
        let inputDir = FileHandler.joinPaths(tilesetSessionsDir, 'input', sessionId);
        let folderFiles = FileHandler.readFolder(rootFolder);
        for(let tileset of state.tilesets){
            if(!tileset.imageId){
                continue;
            }
            let fallbackName = sc.get(tileset, 'filename', tileset.imageId);
            let extension = fallbackName.slice(fallbackName.lastIndexOf('.'));
            let targetName = tileset.mapName ? tileset.mapName+extension : fallbackName;
            let outputPath = FileHandler.joinPaths(rootFolder, targetName);
            let existingName = TilesetImagePersister.matchFileNameIgnoringCase(folderFiles, targetName);
            if(existingName === targetName){
                continue;
            }
            if('' !== existingName){
                FileHandler.moveFile(FileHandler.joinPaths(rootFolder, existingName), outputPath);
                continue;
            }
            let outputByImageId = FileHandler.joinPaths(rootFolder, TilesetConst.OUTPUT_AI_BUFFER_SUB_FOLDER, tileset.imageId);
            if(FileHandler.exists(outputByImageId)){
                FileHandler.copyFile(outputByImageId, outputPath);
                continue;
            }
            let inputPath = FileHandler.joinPaths(inputDir, tileset.imageId);
            if(FileHandler.exists(inputPath)){
                FileHandler.copyFile(inputPath, outputPath);
                continue;
            }
            if(tileset.filePath && FileHandler.exists(tileset.filePath)){
                FileHandler.copyFile(tileset.filePath, outputPath);
                continue;
            }
            let foundSource = TilesetImagePersister.findImageInInputSessions(tilesetSessionsDir, tileset.imageId);
            if(!foundSource){
                Logger.error('TilesetImagePersister.ensureOutputImages: source not found: '+inputPath);
                continue;
            }
            FileHandler.copyFile(foundSource, outputPath);
        }
    }

    static matchFileNameIgnoringCase(folderFiles, targetName)
    {
        let lowerTarget = targetName.toLowerCase();
        for(let fileName of folderFiles){
            if(fileName.toLowerCase() === lowerTarget){
                return fileName;
            }
        }
        return '';
    }

    static findImageInInputSessions(tilesetSessionsDir, imageId)
    {
        let inputBaseDir = FileHandler.joinPaths(tilesetSessionsDir, 'input');
        let sessionFolders = FileHandler.fetchSubFoldersList(inputBaseDir);
        for(let sessionFolder of sessionFolders){
            let candidatePath = FileHandler.joinPaths(inputBaseDir, sessionFolder, imageId);
            if(FileHandler.exists(candidatePath)){
                return candidatePath;
            }
        }
        return null;
    }

    static async loadImageBuffer(sessionId, imageId, rootDir)
    {
        let imagePath = FileHandler.joinPaths(rootDir, 'input', sessionId, imageId);
        if(!FileHandler.exists(imagePath)){
            imagePath = FileHandler.joinPaths(rootDir, 'output', sessionId, TilesetConst.OUTPUT_AI_BUFFER_SUB_FOLDER, imageId);
        }
        if(!FileHandler.exists(imagePath)){
            imagePath = FileHandler.joinPaths(rootDir, 'output', sessionId, imageId);
        }
        return sharp(imagePath).png().toBuffer();
    }

    static updateCroppedElementPaths(tilesetPaths, oldFragment, newFragment, oldFragmentWin, newFragmentWin)
    {
        for(let elementName of Object.keys(tilesetPaths)){
            tilesetPaths[elementName] = tilesetPaths[elementName]
                .split(oldFragment).join(newFragment)
                .split(oldFragmentWin).join(newFragmentWin);
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
            TilesetImagePersister.updateCroppedElementPaths(
                croppedElementsPaths[tilesetFilename],
                oldFragment,
                newFragment,
                oldFragmentWin,
                newFragmentWin
            );
        }
        return croppedElementsPaths;
    }
}

module.exports.TilesetImagePersister = TilesetImagePersister;

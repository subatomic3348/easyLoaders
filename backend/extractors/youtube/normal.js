const extractor = require('../extractor')

async function yotubePrimaryExtractor(url){
   const args = ['-J', url]
    return extractor(url,args)
}
module.exports = yotubePrimaryExtractor
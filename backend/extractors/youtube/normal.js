const extractor = require('../extractor')

async function yotubePrimaryExtractor(url){
   const args = ['-J',
     '--force-ipv4',
    '--cookies','./cookies.txt',
    url
    ]
    return extractor(url,args)
}
module.exports = yotubePrimaryExtractor
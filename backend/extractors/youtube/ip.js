const extractor = require('../extractor')



async function yotubeNetworkFallbackExtractor(url){
    const args = ['-J','--force-ipv4',url]
    return extractor(url,args)
}
module.exports = yotubeNetworkFallbackExtractor
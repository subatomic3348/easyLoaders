const extractor = require('../extractor')
async function yotubeNetworkFallbackExtractor(url){
   const args = [
  '-J',
  '--force-ipv4',
  '--js-runtime', 'node',
  '--extractor-args', 'youtube:player_client=android',
  '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  '--referer', 'https://www.youtube.com/',
  '--add-header', 'Accept-Language:en-US,en;q=0.9',
  url
]
    return extractor(url,args)
}
module.exports = yotubeNetworkFallbackExtractor
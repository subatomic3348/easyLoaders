
const yotubePrimaryExtractor = require('./youtube/normal')
const yotubeNetworkFallbackExtractor = require('./youtube/ip')
const yotubeBrowserExtractor = require('./youtube/mobile')


 const registry = {
    'youtube':[yotubePrimaryExtractor,yotubeNetworkFallbackExtractor,yotubeBrowserExtractor]
}

module.exports = registry


 
const {spawn} = require('node:child_process')
const extractor = require('../extractor')

async function yotubeBrowserExtractor(url){
   const args = ['-J','--force-ipv4',
         '--user-agent' , 'Mozilla/5.0','--referer',url,
           url]
     return extractor(url,args)
}
module.exports = yotubeBrowserExtractor
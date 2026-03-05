const express = require('express')
const app = express() 

const crypto = require('crypto')
const {spawn} = require('node:child_process')
 const mockRegistry = require('./extractors/registry')
const nodeCache = require('node-cache')
 const cache = new nodeCache({stdTTL:300, checkperiod:30})
 const path = require('path')

app.use('/files',express.static(path.join(__dirname,'downloads')))
const fs = require('fs')
 const getVideoId = require('get-video-id')

//cache middleware
 const checkCache = (req,res,next)=>{
    const {id} = getVideoId(req.body.url)
    if(!id){
        console.log("invalid or unsupported video id");
        return next()
        
    }
    req.videoId = id
  
    
    const cachedData = cache.get(id)
    if(cachedData){
        console.log(`Cache hit for key:${id}`);
        return res.json({
            source:'cache',
            test:cachedData
        })
        
        
    }
    console.log(`cache miss for key :${id}`);
        next()
 }

app.use(express.json())






app.post("/api/v1/extract",checkCache,async(req,res)=>{ 
    const url = req.body.url
    const start = Date.now()
    const requestId = crypto.randomUUID()
    console.log({
        requestId,
        event:"extraction starting",
        url
    })
    
   let validUrl;
    try{
   validUrl  = new URL(url)
   
    }
    catch(e){
    
        
        return res.status(400).json({
            message:'invalid url'
        })
    }
    const platform = returnPlatform(validUrl.hostname)
    console.log(platform);
   
    

     if(platform=='unsupported'){
        console.log("hi there from platform");
        
       return  res.status(400).json({
            message:"we dont supported this website"
        })
        return
      }
       const extract = mockRegistry[platform]
      if(!extract){
        return res.status(400).json({
            message:`${platform} not supported`
        })
    }
    const strategies = mockRegistry[platform]
    console.log(strategies);
    
    for(const strategy of strategies){
        try{
            const result = await retryWithBackoff(()=>strategy(url),3,requestId,platform)
            cache.set(req.videoId,result)
            
              const duration = Date.now()-start
              console.log(duration);
            return res.json({
                test:result
            })
        }
        catch(e){
            console.log({
                e,
                requestId,
                stretgy:strategy,
                message:'this stretgy failed ,trying next'
            })
        }
        
        finally{
  
     
     
     }
    }
    return res.status(500).json({
        message:"all extractors failed"
    })
   
    
   
   
    

})

function returnPlatform(hostname) {
  let platform = "";
   const host = hostname.toLowerCase()
    if(host=='youtu.be'){
        platform = 'youtube'
        return platform
    }
   const map = new Map()
  map.set('youtube','youtube.com')
  map.set('facebook','facebook.com')
  map.set('instagram','instagram.com')
  map.set('twitter','x.com')
  

   for(const [key,values] of map){
    if(values===host){
        platform = key
        return platform
    }
    
    else if(host.endsWith('.'+values)){
        platform = key
        return platform
        
    }
    
   }
   if(platform==""){
    return 'unsupported'
   }
}



app.post('/api/v1/download',async(req,res)=>{
    
    let output="";
    const url = req.body.url
     const formatId = req.body.id
    if(!url){
        return res.status(400).json({
            message:'url is required'
        })
    }
    const args = [
         '-f' , `${formatId}+ba/b`,
         
          '-o', 'downloads/%(title)s_%(format_id)s.%(ext)s',
         '--ffmpeg-location',
         '/usr/bin/ffmpeg',
          url
    ]
    const process = spawn('./yt-dlp',args)
    process.stdout.on('data',(data)=>{
        output += data.toString()
    
        
        
        console.log(`stdout: ${data}`);
        
    })
    process.stderr.on('data',(data)=>{
        console.log(`stderr:${data.toString()}`);
        
    })
    process.on('close',async(code)=>{
        if(code!==0){
            return res.status(500).json({
                message:'download failed'
            })
        }
        console.log(output);
        
    const fileName = extractFileName(output)
    const stat = await fs.promises.stat(`downloads/${fileName}`)
    const fileSize = stat.size
    const TTL = 3
    setTimeout(()=>{
        fs.unlink(`downloads/${fileName}`,(err)=>{
            if(err){
                console.log(err);
                
                console.log("there is error file couldnot be deleted");
                
            }
            else{
                console.log(`deleted file is ${fileName}`);
                
            }
        })
    },TTL*60000)
  let date = new Date()
  date.setMinutes(date.getMinutes()+TTL)
  date = date.toString()
  


    const endCodedName = encodeURIComponent(fileName)
   
   
     

        
        
         
        const videoContract = {
            status:"ready",
            file:{
                "name":fileName,
                "size":`${(fileSize/1000000)}MB`,
                "expireAt": date,
                "url":`http://localhost:3000/files/${endCodedName}`


            }
        }
    
        res.json(
            videoContract
        )
        
    })

})

function extractFileName(data){
    const marker = `[Merger] Merging formats into "downloads/`
    const index = data.indexOf(marker)
    if(index==-1){
        return null
    }
    const start = index+marker.length
    const rest = data.slice(start)
    const lastIndex = rest.search(/[\n"]/)
   
    if(lastIndex==-1){
        return rest.trim()
    }
    const prevAns =  rest.slice(0,lastIndex)
    const Ans = prevAns.trim()
    return Ans


}


async function retryWithBackoff(extractor,numberOfRetries,requestId,platform){
    let retries =0
     let wait =1000
     
    while(retries<=numberOfRetries){
        try{
           const data = await extractor()
             return data
        }
        catch(e){
       
        console.log({
            requestId,
            event: "retry attempt",
            attempt:retries,
            delayMS:wait    
        })
         const jitter = Math.random()*wait*0.2
            
           await delay(wait+jitter)
            retries++;
            wait*=2
          
           if(retries>numberOfRetries){
             throw e
           }
           console.log(`retry ${retries} failed for ${platform} `);
           
        }
    }  
}
    function delay(ms){
        return new Promise(resolve=>setTimeout(resolve,ms))
    }

 const PORT = process.env.PORT||3000
app.listen(PORT,()=>{
    console.log(`app is listening on  ${PORT}` );
    
})

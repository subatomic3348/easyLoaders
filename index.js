const express = require('express')
const app = express()
app.use(express.json())
const {spawn} = require('node:child_process')

app.use('/files',express.static('downloads'))
const fs = require('fs')



app.post("/api/v1/extract",async(req,res)=>{
    const url =  req.body.url
   try {
    const validUrl = new URL(url) 
    const platform = returnPlatform(validUrl.hostname)

     if(platform=='unsupported'){
         res.status(400).json({
            message:"we dont supported this website"
        })
        return
      }

  const mocktest =  await mockRegistry[platform](url)
  if(!mocktest){
    return res.json({
        message:"not supported stream"
    })
  }
  else{
  return  res.json({
        test : mocktest
    })
  }
         
   }
   catch(e){
    console.log(e);
    
    return res.status(400).json({
        message:"invalid url"
    })

   }
   
    

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

async function YotubeExtractor(url){
    let stream="";
    return new Promise((resolve,reject)=>{
        console.log('hii there')
        const videoProcess = spawn('yt-dlp',['-J',url])
        console.log(' hi from spwans');
        
        videoProcess.stdout.on('data',(data)=>{
            stream+=data.toString()
            console.log('hi from inside data add o');
            
        })
        videoProcess.on('close',(code)=>{
            if(code!=0){
                reject()
                return
            }
          
            
            const output = JSON.parse(stream)
            console.log(output);
            
        
            
            const cleanFormat = output.formats.filter(f=>{
                return (
                    f.vcodec!=='none'&&
                    // f.acodec!=='none'&&
                    f.ext==='mp4'&&
                    !f.format_id.startsWith('sb')&&
                    f.url
                   
                )
            })
            const finalFormats = cleanFormat.map(f=>({
                id:f.format_id,
                quality:`${f.height}p`,
                mime:  `video/${f.ext}`,
                url:f.url
            }))
           
            
            finalFormats.sort((a,b)=>{
                return parseInt(a.quality)-parseInt(b.quality)
            })
           
           
           
           
           
            const contract = {
                platform:"youtube",
                title: output.title,
                formats:finalFormats
                
                
            }
           
          resolve(contract)
            console.log(`child process exited with code ${code} `);
            
        })
       videoProcess.stderr.on('data', (data) => {
  console.error('yt-dlp stderr:', data.toString())
})

    })
 
}
const mockRegistry = {
    'youtube': YotubeExtractor,    
}


app.post('/api/v1/download',(req,res)=>{
    let output="";
    const url = req.body.url
    if(!url){
        return res.status(400).json({
            message:'url is required'
        })
    }
    const args = [
       
          '-o', 'downloads/%(title)s.%(ext)s',
         '--ffmpeg-location',
         '/usr/bin/ffmpeg',
          url
    ]
    const process = spawn('yt-dlp',args)
    process.stdout.on('data',(data)=>{
        output += data.toString()
    
        
        
        console.log(`stdout: ${data}`);
        
    })
    process.stderr.on('data',(data)=>{
        console.log(`stderr:${data.toString()}`);
        
    })
    process.on('close',(code)=>{
        if(code!==0){
            return res.status(500).json({
                message:'download failed'
            })
        }
    const fileName = extractFileName(output)
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
                "size":"10mb",
                "expireAt": date,
                "url":`files/${endCodedName}`


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

app.listen(3000,()=>{
    console.log("app is listening on port 3000");
    
})

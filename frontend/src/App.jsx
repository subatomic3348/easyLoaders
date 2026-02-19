import { useState } from "react"


  function App() {
  const [url,setUrl] = useState("")
  const  [videoData,setVideoData] = useState(null)
  const  [loading,setLoading] = useState(false)
  const  [error,setError] = useState(null)

   
   
   
 async function getData(){
   setLoading(true)
   setVideoData(null)
   setError(null)
 
   
   const response = await fetch('/api/v1/extract',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
    },
    body:JSON.stringify({
      url:url
    })
  })
  if(!response.ok){
   console.log(response.status);
    setLoading(false)
    const message = await response.text()
    setError(message)
   
   return
   
  }
   
   

  const data = await response.json()
  setVideoData(data)
  setLoading(false)
   
  
 

  

 }

 async function downloadData(id){
  setLoading(true)
  const response = await fetch('/api/v1/download',{
    method: 'POST',
    headers:{
      'Content-Type':'application/json'
    },
    body: JSON.stringify({
      url: url,
      id:id
    })
    
  

  })
  if(!response.ok){
    setLoading(false)
    const message = await response.text()
    setError(message)
    console.log(response.status);
    
    return
  }
  const data = await response.json()
  setLoading(false)
  setError(data.status)
  
 }  

  return (
    <>
    <div>
      {loading&& <p>loading....</p>}
     {videoData && (
  <div>
    <h3>{videoData.test.title}</h3>
    {videoData.test.formats.map(f => (
      <button key={f.id} onClick={()=> downloadData(f.id)} >
        {f.quality}
       
      </button>
    ))}
  </div>
)}

      {error}
    </div>
    <input onChange={(e)=>setUrl(e.target.value)} type="text" placeholder="url" />
    <button onClick={()=>getData()}>extract</button>
    
      
    </>
  )
}

export default App

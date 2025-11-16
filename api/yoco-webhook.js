export default async function handler(req,res){
   if(req.method !== "POST") {
     retrun res.status(405).json({error:"Method Not Allowed"});
   }

//for now,simple test response
res.status(200).json({
  message: "Webhook working!"
});
}

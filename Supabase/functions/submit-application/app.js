(() => {
const $=id=>document.getElementById(id);
$("year").textContent=new Date().getFullYear();
$("menuBtn").addEventListener("click",()=>$("navLinks").classList.toggle("open"));
document.querySelectorAll("#navLinks a").forEach(a=>a.addEventListener("click",()=>$("navLinks").classList.remove("open")));
const supaConfig=window.LOVE_FOR_HOPE_CONFIG||{};
const configured=!!(supaConfig.supabaseUrl&&supaConfig.supabaseAnonKey&&window.supabase);
const client=configured?window.supabase.createClient(supaConfig.supabaseUrl,supaConfig.supabaseAnonKey):null;
function show(el,msg,ok){el.textContent=msg;el.className="status "+(ok?"ok":"err");}
function calcAge(d){if(!d)return null;const b=new Date(d+"T00:00:00"),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;return a;}
$("dob").max=new Date().toISOString().slice(0,10);
$("dob").addEventListener("change",()=>{const a=calcAge($("dob").value);$("ageText").textContent=a===null?"Age must be 9–18 years.":`Calculated age: ${a} years. Eligibility is 9–18 years.`;});
const form=$("applicationForm");
form.addEventListener("submit",async e=>{
 e.preventDefault();const status=$("formStatus"),btn=$("submitBtn");
 if(!configured){show(status,"The secure application service is not configured yet. Please contact the organisation; do not email identity documents through this demo website.",false);return;}
 const age=calcAge($("dob").value);if(age===null||age<9||age>18){show(status,"The official organisation profile currently sets eligibility at 9–18 years. Please check the date of birth.",false);return;}
 const files={birth_certificate:$("birth").files[0],enrolment_proof:$("enrol").files[0],academic_report:$("report").files[0],additional_document:$("other").files[0]};
 const allowed=["application/pdf","image/jpeg","image/png"];
 for(const [key,file] of Object.entries(files)){if(!file)continue;if(!allowed.includes(file.type)){show(status,`Unsupported file type for ${key}. Upload PDF, JPG or PNG only.`,false);return;}if(file.size>1*1024*1024){show(status,`${key} exceeds the 1 MB per-file limit.`,false);return;}}
 const totalBytes=Object.values(files).filter(Boolean).reduce((n,f)=>n+f.size,0);if(totalBytes>4*1024*1024){show(status,"The combined documents exceed 4 MB. Please compress the files and try again.",false);return;}
 btn.disabled=true;btn.textContent="Preparing secure upload…";status.className="status ok";status.textContent="Preparing your application and documents…"; 
 try{
  const fd=new FormData(form);const data={};for(const [k,v] of fd.entries())if(!(v instanceof File))data[k]=v;
  data.age=age;data.guardian_consent=true;data.documents={};
  let completed=0;const fileEntries=Object.entries(files).filter(([,f])=>f);for(const [key,file] of fileEntries){status.textContent=`Preparing secure upload: ${++completed} of ${fileEntries.length} documents…`;data.documents[key]={name:file.name,type:file.type,base64:await fileToBase64(file)};}
  const {data:result,error}=await client.functions.invoke("submit-application",{body:data});
  if(error)throw error;if(!result||!result.reference)throw new Error("The server did not return an application reference.");
  show(status,`Application received successfully. Your reference number is ${result.reference}. Acknowledgement will be sent to your email if email delivery is configured. Keep this reference for follow-up.`,true);
  form.reset();$("ageText").textContent="Age must be 9–18 years.";
 }catch(err){console.error(err);show(status,err.message||"Submission failed. Please try again or contact Love for Hope.",false);}
 finally{btn.disabled=false;btn.textContent="Submit secure application";}
});
function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(file);});}
$("contactForm").addEventListener("submit",async e=>{e.preventDefault();const st=$("contactStatus");if(!configured){show(st,"Enquiry service is not configured yet. Please email lovelyforhope@gmail.com.",false);return;}const body=Object.fromEntries(new FormData(e.currentTarget).entries());try{const {error}=await client.functions.invoke("contact-enquiry",{body});if(error)throw error;show(st,"Thank you. Your enquiry has been sent.",true);e.currentTarget.reset();}catch(err){show(st,err.message||"Could not send enquiry. Please email us directly.",false);}});
$("adminLogin").addEventListener("submit",async e=>{e.preventDefault();const st=$("loginStatus");if(!configured){show(st,"Admin service is not configured.",false);return;}const {data,error}=await client.auth.signInWithPassword({email:$("adminEmail").value,password:$("adminPassword").value});if(error){show(st,"Sign-in failed. Check your credentials or contact the system administrator.",false);return;}const {data:admin,error:ae}=await client.from("admin_users").select("user_id,role").eq("user_id",data.user.id).maybeSingle();if(ae||!admin){await client.auth.signOut();show(st,"This account is not authorised as an administrator.",false);return;}st.className="status";$("adminArea").style.display="block";$("adminLogin").style.display="none";loadApplications();});
async function loadApplications(){const out=$("adminResults");out.textContent="Loading…";const {data,error}=await client.from("applications").select("id,reference,student_name,age,county,school_name,guardian_name,guardian_phone,guardian_email,status,created_at").order("created_at",{ascending:false}).limit(100);if(error){out.textContent="Unable to load applications.";return;}out.innerHTML="";if(!data.length){out.textContent="No applications received yet.";return;}const table=document.createElement("table");table.style.cssText="width:100%;border-collapse:collapse;font-size:.86rem;margin:16px 0";table.innerHTML="<thead><tr><th>Reference</th><th>Student</th><th>Age</th><th>County</th><th>Status</th><th>Documents</th></tr></thead>";const tbody=document.createElement("tbody");for(const row of data){const tr=document.createElement("tr");tr.innerHTML=`<td>${esc(row.reference)}</td><td>${esc(row.student_name)}</td><td>${row.age}</td><td>${esc(row.county)}</td><td></td><td></td>`;const sel=document.createElement("select");["Pending","Documents Received","Under Verification","Approved","Rejected","Home Assessment","Scholarship Awarded"].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;o.selected=s===row.status;sel.append(o)});sel.addEventListener("change",async()=>{const {error}=await client.from("applications").update({status:sel.value}).eq("id",row.id);if(error)alert("Status update failed.");});tr.children[4].append(sel);const docs=document.createElement("button");docs.className="btn light";docs.textContent="View files";docs.style.padding="7px";docs.addEventListener("click",()=>viewDocs(row.id));tr.children[5].append(docs);tbody.append(tr);}table.append(tbody);out.append(table);}
async function viewDocs(id){const {data,error}=await client.from("application_documents").select("storage_path,document_type,file_name").eq("application_id",id);if(error){alert("Unable to list documents.");return;}let msg="Private document links (valid for 5 minutes):\n";for(const d of data){const {data:signed,error:se}=await client.storage.from("application-documents").createSignedUrl(d.storage_path,300);if(!se)msg+=`${d.document_type} (${d.file_name}): ${signed.signedUrl}\n`; }alert(msg||"No documents found.");}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("refreshAdmin").addEventListener("click",loadApplications);$("adminLogout").addEventListener("click",async()=>{await client.auth.signOut();$("adminArea").style.display="none";$("adminLogin").style.display="block";});
})();
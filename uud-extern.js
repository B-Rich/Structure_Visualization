(function(v){function w(a){var b=new q;b.AddElements(a);return b.GetElements()}jQuery.support.cors=!0;"undefined"===typeof TMS&&(TMS={UI:{},internal:{UUD:{}}});jQuery.extend(TMS,{trackset_poll_interval:3E4,trackset_enable_polling:!1,base_path:"//www.ncbi.nlm.nih.gov/projects/genome/trackmgr/",cgi_path:"0.7/",myncbi_js_path:"myncbi/js/",cgis:{supportedassm:"supported_assembly.cgi",disptracks:"disptracks.cgi",trackdatacount:"trackdatacount.cgi",trackdata:"trackdata.cgi",trackbyacc:"trackbyacc.cgi",
trackbyid:"trackbyid.cgi",facetset:"facets.cgi",tracksearch:"tracksearch.cgi",registertracks:"createtracks.cgi",deregistertrack:"removetrack.cgi",updatetrackattrs:"updatetrackattrs.cgi",retrievetracksets:"retrieve_tracksets.cgi",createtrackset:"create_trackset.cgi",featid_dl:"featid_dl.cgi"},ncfetch_url:"/projects/sviewer/ncfetch.cgi",trackmgr_version:"0.7.8",logErrors:!0,GetCgiUrl:function(a){return TMS.base_path+TMS.cgi_path+TMS.cgis[a]},ValidateConfig:function(a,b){var c={};if(null!=a&&null!=b){var d=
[];jQuery.each(b,function(b,c){a.hasOwnProperty(c)||d.push(new TMS.Error("Required attribute not specified: "+c))});0<d.length&&(c.errors=d)}return c}});TMS.Enum=function(a,b){jQuery.extend(this,a);for(var c in a)a.hasOwnProperty(c)&&(this[c.toUpperCase()]=this[c]);this._getEnumName=function(){return b}};TMS.Enum.prototype={IsValid:function(a){for(var b in this)if(this.hasOwnProperty(b)&&a==this[b])return!0;return!1},ValidatedValue:function(a,b){var c=b,d=void 0!==b||void 0!==this.Default||void 0!==
this.DEFAULT;this.IsValid(a)?(c=a,d=!0):c=c||this.Default||this.DEFAULT;!d&&window.console&&this._getEnumName&&window.console.log('*** Invalid value "'+a+'" for enum '+this._getEnumName());return c}};TMS.Status=new TMS.Enum({Ok:"ok",Warnings:"warning",Loading:"loading",Errors:"error",Failed:"failed"},"TMS.Status");TMS.StatusCode={ok:0,warning:1,errors:2,failed:3};TMS.Severity=new TMS.Enum({Default:"error",warning:"warning",info:"info",error:"error"},"TMS.Severity");TMS.TrackListType={tms:"tms",named:"named",
blast:"blast",search:"search"};TMS.Position=new TMS.Enum({Default:"bottom",top:"top",bottom:"bottom"},"TMS.Position");TMS.RelativePosition=new TMS.Enum({before:"before",after:"after"},"TMS.RelativePosition");TMS.TrackSetType=new TMS.Enum({DefaultTrackSet:"default-trackset",TMS:"tms",myNCBI_Collection:"myncbi-collection"},"TMS.TrackSetType");TMS.TrackSetStatus={supplanted:"Supplanted",assembly_null:"null assembly",unchanged:"Unchanged",setassembly_gettracksets:"SetAssembly-GetTracksets",trackset_not_retrieved:"TrackSet not retrieved",
gettracksets_pending_setassembly:"GetTracksets-pending-SetAssembly",gettracksets:"GetTracksets",cached_tracksets:"Cached tracksets",error:"Error"};TMS.Log=window.console?function(){1===arguments.length?window.console.log(arguments[0]):1<arguments.length&&window.console.log(arguments)}:function(){};window.console&&jQuery.isFunction(window.console.error)?TMS.LogError=function(){1===arguments.length?window.console.error(arguments[0]):0===arguments.length?window.console.error("Unspecified error"):window.console.error(arguments)}:
TMS.LogError=function(a){TMS.Log("*** "+a)};TMS.Error=function(a,b){this.m_Severity=TMS.Severity.ValidatedValue(b);this.m_Description=a;this.m_Prefix=""};TMS.Error.prototype={SetPrefix:function(a){this.m_Prefix=a},toString:function(){return this.m_Severity+": "+this.m_Prefix+this.m_Description},Log:function(){switch(this.m_Severity){case TMS.Severity.error:TMS.LogError(this.toString());break;default:TMS.Log(this.toString())}}};TMS.ReportErrors=function(a,b){0<b.length&&jQuery.each(b,function(b,d){d.SetPrefix(a);
d.Log()})};var l=function(){this.m_Cache={}};l.prototype={Get:function(a){return this.m_Cache[a]},Store:function(a,b){this.m_Cache[a]=b},Remove:function(a){delete this.m_Cache[a]}};TMS.TrackMgr={SetTrack:function(a,b,c){null!=a&&null!=b&&null!=c&&TMS.TrackMgr.GetTICache(a).Store(b,c)},GetTrack:function(a,b,c,d){return null==a||null==b?null:TMS.TrackMgr.GetTICache(a,c,d).Get(b)},GetTrackInfo:function(a,b,c,d){if(null==a)return null;null==b&&(b="tmssvc");var e=new TMS.TrackInfo(a);e.AddDataSource(b);
a=TMS.TrackInfo.ExtractTMSId(a);if(a!==e.GetTMSId())return TMS.LogError("Internal error: track id mismatch ["+a+"] vs ["+e.GetTMSId()+"]"),null;b=TMS.TrackMgr.GetTrack("TMS",a,c,d);if(null!=b)return b.MergeAttrFrom(e),b;TMS.TrackMgr.GetTICache("TMS",c,d).Store(a,e);return e},RetrieveFullAttributes:function(a,b){var c=[],d=[];jQuery.each(a,function(a,e){var f=TMS.TrackMgr.GetTrack("TMS",e,b.client,b.resource);null!=f&&(f.HasDataSource("tmssvc")||c.push(f),f.HasDataSource("tmssearch")||d.push(f))});
var e=[];0<c.length&&e.push(TMS.GetTracksById(c,b));if(0<d.length){var f=jQuery.map(d,function(a,b){return a.GetTMSId()}).join(",");e.push(TMS.Search(jQuery.extend({accs:f,return_facets:!1,count:d.length,client:b.client,resource:b.resource},b)))}return jQuery.when.apply(jQuery,e)},ClearTrackCache:function(a,b,c){null!=a&&TMS.TrackMgr.GetTICache("TMS",b,c).Remove(a)},GetTICache:function(a,b,c){if(null==b&&null==c)return TMS.TrackMgr.s_TICache.TMS;a=a+"-@-"+(b||"null")+"-@-"+(c||"null");TMS.TrackMgr.s_TICache.hasOwnProperty(a)||
(TMS.TrackMgr.s_TICache[a]=new l);return TMS.TrackMgr.s_TICache[a]},s_TICache:{TMS:new l}};var x=function(a){var b=new jQuery.Deferred,c={t:a};jQuery.ajax({dataType:"json",async:!0,type:"POST",url:TMS.GetCgiUrl("deregistertrack"),data:c,xhrFields:{withCredentials:!0}}).done(function(c,e,f){e=[];if(c.hasOwnProperty("messages")&&(e=jQuery.map(c.messages,function(a,b){if(a.hasOwnProperty("level")&&"error"===a.level)return a.message}),0<e.length)){b.rejectWith(b,[f,"error",e.join("\n")]);return}"success"===
c.status?(TMS.TrackMgr.ClearTrackCache(a),b.resolve()):b.rejectWith(b,[f,"error","unable to deregister track ["+a+"]"])}).fail(function(c,e,f){b.rejectWith(b,[c,"error","unable to deregister track ["+a+"]: "+f])});return b.promise()},y=function(a,b){var c=new jQuery.Deferred,d={t:a,attrs:b};jQuery.ajax({dataType:"json",async:!0,type:"POST",url:TMS.GetCgiUrl("updatetrackattrs"),data:d,xhrFields:{withCredentials:!0}}).done(function(b,d,g){"success"===b.status?c.resolve():c.rejectWith(c,[g,"error","unable to update track attributes ["+
a+"]"])}).fail(function(b,d,g){c.rejectWith(c,[b,"error","unable to update track attributes ["+a+"]: "+g])});return c.promise()};TMS.RegisterTracks=function(a){var b={"CreateTracksCGI-Request":{tracks:a}};a=new jQuery.Deferred;b=jQuery.ajax({dataType:"jsonp",async:!0,type:"POST",url:TMS.GetCgiUrl("registertracks"),data:{req:JSON.stringify(b)},xhrFields:{withCredentials:!0}});this.x_AddRegisterCBs(b,a);return a.promise()};var z=function(a){return(new jQuery.Deferred(function(b){null!=a&&jQuery.isArray(a)?
b.rejectWith(b,a):b.reject()})).promise()};TMS.RegisterSADBTrack=function(a,b,c,d){if(null==a||0===a.length)return(new TMS.Error("SADB accession not specified",TMS.Severity.error)).Log(),z([null,"error","SADB accession not specified"]);if(null==b||0===b.length)b=a+"[SADB]";var e=[];null!=d&&jQuery.each(d,function(a,b){e.push({key:a,value:b})});a={identity:{ids:[]},"track-name":b,"track-descr":b,"assembly-acc":c,"data-items":[{datakey:a,seqids:[]}],"access-perms":{"access-level":"public"}};0<e.length&&
(a.attrs=jQuery.map(e,function(a,b){return null!=a.value&&0<a.value.length?a:null}));return TMS.RegisterTracks([a])};TMS.RegisterBlastRID=UUD.RegisterBlastRID;TMS.RegisterSVDLTracks=UUD.RegisterSVDLTracks;var r=function(a){this.x_SetName(a)};r.prototype={GetName:function(){return this.m_Name},GetGroup:function(){return null},GetOrdering:function(){return null},CanDeregister:function(){return!1},Deregister:function(){var a=this;return(new jQuery.Deferred(function(b){b.rejectWith(a,["Cannot deregister this track"])})).promise()},
x_SetName:function(a){this.m_Name=a},x_SetOrdering:function(a){this.m_Ordering=a},ToString:function(){return"name: "+this.GetName()}};TMS.TrackInfo=function(a){this.x_SetName(a.name);this.m_Track_id=TMS.TrackInfo.ExtractTMSId(a);if(a.hasOwnProperty("attrs")){var b=this.m_Attrs={};jQuery.each(a.attrs,function(a,c){b[c.key]=c.value})}if(a.hasOwnProperty("seqs")){var c=this.m_SeqidCounts={};jQuery.each(a.seqs,function(a,b){var f=c["GI:"+b.seq_id.gi]={};jQuery.each(b.counts.counts,function(a,b){f[b.type]=
b.count});if(b.hasOwnProperty("seq_id2")){var g="GI:"+b.seq_id2.gi;c.hasOwnProperty(g)||(c[g]={});var h=c[g];jQuery.each(b.counts.counts,function(a,b){h[b.type]=b.count})}})}a.hasOwnProperty("rid")&&(this.m_RID=a.rid);this.m_Datasources={}};TMS.TrackInfo.ExtractTMSId=function(a){try{return a.dtrack_id.tag.str}catch(b){return null}};TMS.TrackInfo.prototype=new r;TMS.TrackInfo.prototype.GetTMSId=function(){return this.m_Track_id};TMS.TrackInfo.prototype.GetAllAttrs=function(a){return Boolean(a)?jQuery.extend({},
this.m_Attrs):this.m_Attrs};TMS.TrackInfo.prototype.GetAttr=function(a){return null==this.m_Attrs?null:this.m_Attrs[a]};TMS.TrackInfo.prototype.GetDisplayOptions=function(a){return this.GetAttr("display_settings")};TMS.TrackInfo.prototype.GetCounts=function(){return this.m_SeqidCounts};TMS.TrackInfo.prototype.GetCount=function(a,b){return null==this.m_SeqidCounts?null:this.m_SeqidCounts[a][b]};TMS.TrackInfo.prototype.GetTotalCount=function(a){return this.GetCount(a,"total")};TMS.TrackInfo.prototype.GetGroup=
function(){return this.GetAttr("group")};TMS.TrackInfo.prototype.GetOrdering=function(){return this.GetAttr("track_order_by")};TMS.TrackInfo.prototype.AddDataSource=function(a){this.m_Datasources[a]=null};TMS.TrackInfo.prototype.HasDataSource=function(a){return this.m_Datasources.hasOwnProperty(a)};TMS.TrackInfo.prototype.ToString=function(){return"track id: "+this.GetId()+", name: "+this.GetName()+", group: "+this.GetGroup()+(jQuery.isFunction(Object.keys)?", attr count: "+Object.keys(this.m_Attrs).length:
"")};TMS.TrackInfo.prototype.CanDeregister=function(){return!0};TMS.TrackInfo.prototype.IsBLASTTrack=function(){return null!=this.m_RID};TMS.TrackInfo.prototype.GetRID=function(){return this.m_RID};TMS.TrackInfo.prototype.Deregister=function(){return this.CanDeregister()?x(this.m_Track_id):r.prototype.Deregister.call(this)};TMS.TrackInfo.prototype.SetAttributes=function(a){null!=a&&y(this.m_Track_id,a)};TMS.TrackInfo.prototype.MergeAttrFrom=function(a){if(null!=a&&null!=a.m_Attrs){var b=this;null==
b.m_Attrs&&(b.m_Attrs={});jQuery.each(a.m_Attrs,function(a,d){b.m_Attrs.hasOwnProperty(a)||(b.m_Attrs[a]=d)});jQuery.extend(b.m_Datasources,a.m_Datasources)}};var k=function(a,b){this.m_Tracks=[];this.x_SetTracks(a,b)};k.FromDispTracksCgi=function(a,b,c,d){var e=[];a.hasOwnProperty("display_tracks")&&e.push(new k(jQuery.map(a.display_tracks,function(a,e){return TMS.TrackMgr.GetTrackInfo(a,b,c,d)})));a.hasOwnProperty("blast_tracks")&&TMS.LogError("Internal error: blast_tracks not supported");return e};
TMS.internal.UUD.TrackList=k;k.prototype={GetTracks:function(){return this.m_Tracks},x_SetTracks:function(a,b){null!=a&&(jQuery.isArray(a)?this.m_Tracks=null==b||b?jQuery.extend([],a):a:TMS.LogError("Internal error: expected an array of tracks"))}};TMS.NamedTrackList=function(a,b,c){this.x_SetTracks(a);this.x_SetName(b);this.x_SetDesc(c)};TMS.NamedTrackList.prototype=new k;TMS.NamedTrackList.prototype.x_SetName=function(a){this.m_Name=a};TMS.NamedTrackList.prototype.x_SetDesc=function(a){this.m_Description=
a};TMS.NamedTrackList.prototype.GetName=function(){return this.m_Name};TMS.NamedTrackList.prototype.GetDescription=function(){return this.m_Description};TMS.IdTrackList=function(a,b){this.m_Promise=null!=b?this.x_RetrieveTracks(a,b.client,b.resource):this.x_RetrieveTracks(a);if(null!=b){if(b.hasOwnProperty("allAttributes")&&b.allAttributes){var c=this.m_Promise;this.m_Promise=new jQuery.Deferred;var d=this;c.done(function(){TMS.TrackMgr.RetrieveFullAttributes(a,b).done(function(){d.m_Promise.resolveWith(d)}).fail(function(){d.m_Promise.rejectWith(d)})})}b.hasOwnProperty("onReady")&&
jQuery.isFunction(b.onReady)&&this.m_Promise.done(b.onReady)}};TMS.IdTrackList.prototype=new k;var t=function(a,b,c){var d=this,e=jQuery.isFunction(this.x_SetTracks),f=function(g,f,h){null!=g&&g.hasOwnProperty("tracks")&&g.tracks.hasOwnProperty("display_tracks")&&(jQuery.each(g.tracks.display_tracks,function(a,d){TMS.TrackMgr.GetTrackInfo(d,"tmssvc",b,c)}),e&&(g=jQuery.map(a,function(a,d){return TMS.TrackMgr.GetTrack("TMS",a,b,c)}),d.x_SetTracks(g,!1)))},g=[],h=[];jQuery.each(a,function(a,d){var e=
TMS.TrackMgr.GetTrack("TMS",d,b,c);null==e?g.push(d):h.push(e)});if(0===g.length)return e&&this.x_SetTracks(h,!1),(new jQuery.Deferred).resolveWith(this).promise();var p={id:g.join(",")};null!=b&&(p.client=b);null!=c&&(p.resource=c);var p={dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("trackbyid"),xhrFields:{withCredentials:!0},data:p},n=new jQuery.Deferred;jQuery.ajax(p).done(function(a,b,c){f(a,b,c);n.resolveWith(d)}).fail(function(a,b,c){b="error retrieving tracks by id ["+
b+"]: "+c;TMS.LogError(b);n.rejectWith(d,[a,"",b])});return n.promise()};TMS.IdTrackList.prototype.x_RetrieveTracks=t;TMS.GetTracksById=function(a,b){return(new TMS.IdTrackList(a,b)).m_Promise.promise()};TMS.DataAccTrackList=function(a,b){this.m_Promise=null!=b?this.x_RetrieveTracks(a,b.client,b.resource):this.x_RetrieveTracks(a);if(null!=b){if(b.hasOwnProperty("allAttributes")&&b.allAttributes){var c=this;this.m_Promise=this.m_Promise.then(function(){var a=jQuery.map(this.GetTracks(),function(a,
b){return a.GetTMSId()});return TMS.TrackMgr.RetrieveFullAttributes(a,b)});this.m_Promise=this.m_Promise.then(function(){return jQuery.Deferred().resolveWith(c)})}b.hasOwnProperty("onReady")&&jQuery.isFunction(b.onReady)&&this.m_Promise.done(b.onReady)}};TMS.DataAccTrackList.prototype=new k;TMS.DataAccTrackList.prototype.x_RetrieveTracks=function(a,b,c){var d=this,e=function(a,e,f){null!=a&&a.hasOwnProperty("tracks")&&a.tracks.hasOwnProperty("display_tracks")&&(a=jQuery.map(a.tracks.display_tracks,
function(a,d){return TMS.TrackMgr.GetTrackInfo(a,"tmssvc",b,c)}),d.x_SetTracks(a,!1))};a={acc:a.join(",")};null!=b&&(a.client=b);null!=c&&(a.resource=c);a={dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("trackbyacc"),data:a};var f=new jQuery.Deferred;jQuery.ajax(a).done(function(a,b,c){e(a,b,c);f.resolveWith(d)}).fail(function(a,b,c){b="error retrieving tracks by data accession ["+b+"]: "+c;TMS.LogError(b);f.rejectWith(d,[a,"",b])});return f.promise()};TMS.GetTracksByAcc=function(a,
b){return(new TMS.DataAccTrackList(a,b)).m_Promise.promise()};var A={query:null,client:null,resource:null,assm_accs:null,filters:null,offset:0,count:10,result_cb:null,return_facets:!0,return_zero_counts:!1},B=function(a,b){var c=new TMS.SearchResult,d=function(d,e,f,g){if(null!=e&&(e.hasOwnProperty("tracks")&&(c.m_TrackList=new k,f=k.FromDispTracksCgi(e.tracks,"tmssearch",b.client,a),jQuery.each(f,function(a,b){c.m_TrackList.x_SetTracks(b.GetTracks());return!1})),null!=d&&e.hasOwnProperty("stats")&&
(c.x_SetRecordCount(e.stats.record_count),e.stats.hasOwnProperty("facets")))){var h=[];jQuery.each(e.stats.facets,function(a,b){var c=b.hasOwnProperty("flags")&&b.flags.fields_complete,e=jQuery.map(b.fields,function(a,b){return a.field.hasOwnProperty("not_set")?new TMS.FacetField(a.count):new TMS.FacetField(a.count,a.field.name)}),f=d.GetFacet(b.name);null!=f?(h.push(b.name),f.SetFields(e,c)):TMS.LogError("Internal error: unrecognized facet ["+b.name+"]")});jQuery.each(d.GetFacetsExcept(h),function(a,
b){b.ClearFields()});c.x_SetFacetSet(d)}},e=!b.hasOwnProperty("xf"),f=e?TMS.GetFacetSet(a,b.client):jQuery.Deferred().resolve(),g={dataType:"json",async:!0,type:"POST",data:b,processData:!0,url:TMS.GetCgiUrl("tracksearch"),xhrFields:{withCredentials:!0}},h=new jQuery.Deferred;jQuery.ajax(g).done(function(a,b,g){a.hasOwnProperty("error")?(TMS.LogError(a.error),h.rejectWith(c,[g,"",a])):f.done(function(){var f=e?this.Clone():null;d(f,a,b,g);h.resolveWith(c)})}).fail(function(a,b,d){b="error refreshing track list ["+
b+"]: "+d;TMS.LogError(b);h.rejectWith(c,[a,"",b])});return h.promise()};TMS.Search=function(a){a=jQuery.extend({},A,a);var b={accs:a.accs,t:a.query,client:a.client||"",resource:a.resource||null,assm_accs:a.assm_accs,offset:a.offset,pageSize:a.count};null!=a.filters&&jQuery.each(a.filters,function(a,c){if(null!=c){var d;d=jQuery.isArray(c)?jQuery.map(c,function(a,b){return null==a?"@null@":a}).join("|"):c;b[a]=d}});null==a.return_facets||a.return_facets?(a.hasOwnProperty("search_facets")&&jQuery.each(a.search_facets,
function(a,c){c.hasOwnProperty("length")&&0<c.length&&(b[a+"-s"]=c)}),null!=a.return_zero_counts&&a.return_zero_counts&&(b.iz="")):b.xf="";var c={};jQuery.each(b,function(a,b){null!=b&&(c[a]=b)});var d=B(b.resource,c);null!=a.result_cb&&jQuery.isFunction(a.result_cb)&&d.done(a.result_cb);return d};TMS.SearchResult=function(a){this.m_QueryParams=a};TMS.SearchResult.prototype={GetTrackList:function(){return this.m_TrackList},GetFacetSet:function(){return this.m_FacetSet},GetRecordCount:function(){return this.m_RecordCount},
x_SetRecordCount:function(a){this.m_RecordCount=a},x_SetFacetSet:function(a){this.m_FacetSet=a}};TMS.FacetField=function(a,b){this.m_Count=a;this.m_Field=b||null};TMS.FacetField.prototype={GetField:function(){return this.m_Field},GetCount:function(){return this.m_Count}};TMS.Facet=function(a,b,c,d,e,f){this.m_Internal_name=a;this.m_Display_name=b;this.m_Ordering=c;this.m_Group_label=f;this.m_Is_default=function(a){switch(jQuery.type(d)){case "null":case "undefined":return!1;case "string":switch(a.toLowerCase()){case "true":case "yes":case "1":return!0;
default:return!1}case "boolean":return a;case "number":return 0===a?!1:!0;default:return!1}}(d);this.m_Fields=[];this.m_FieldByName={};this.SetFields(e)};TMS.Facet.prototype={GetInternalName:function(){return this.m_Internal_name},GetDisplayName:function(){return this.m_Display_name},GetGroupLabel:function(){return this.m_Group_label},GetOrdering:function(){return this.m_Ordering},IsDefault:function(){return this.m_Is_default},IsComplete:function(){return this.m_Is_complete},ClearFields:function(){this.m_Fields=
[];this.m_FieldsByName={};this.m_Is_complete=!1},SetFields:function(a,b){if(null!=a&&jQuery.isArray(a)){null!=b&&(this.m_Is_complete=Boolean(b));this.m_Fields=a;var c=this.m_FieldByName={};jQuery.each(a,function(a,b){c[b.GetField()]=b})}},GetFields:function(){return this.m_Fields},GetField:function(a){return this.m_FieldByName[a]}};TMS.GetFacetSet=function(a,b){if(TMS.FacetSet.s_resourcecache.hasOwnProperty(a)){var c=TMS.FacetSet.s_resourcecache[a];return(new jQuery.Deferred(function(a){a.resolveWith(c)})).promise()}var c=
new TMS.FacetSet(a),d={resource:a};null!=b&&(d.client=b);var d={dataType:"xml",async:!0,type:"POST",data:d,processData:!0,url:TMS.GetCgiUrl("facetset"),xhrFields:{withCredentials:!0}},e=new jQuery.Deferred;jQuery.ajax(d).done(function(b,d,h){b=jQuery("facet",b).map(function(a,b){var c=v(this),d=c.children("group_label");return new TMS.Facet(c.children("query_name").text(),c.children("display_name").text(),c.children("display_order").text(),c.children("is_default").text(),null,null==d?null:d.text())});
c.x_AddFacets(b.get());TMS.FacetSet.s_resourcecache[a]=c;e.resolveWith(c)}).fail(function(b,d,h){d="error retrieving facet list for application "+a+" ["+d+"]: "+h;TMS.LogError(d);e.rejectWith(c,[b,"",d])});return e.promise()};TMS.FacetSet=function(a,b){this.m_Resource=a;this.m_Facets=jQuery.isArray(b)?b:[];this.m_FacetsByName={}};TMS.FacetSet.s_resourcecache={};TMS.FacetSet.prototype={GetResource:function(){return this.m_Resource},GetFacets:function(){return this.m_Facets},GetFacetsExcept:function(a){var b=
[],c={};jQuery.each(a,function(a,b){c[b]=null});jQuery.each(this.m_FacetsByName,function(a,e){c.hasOwnProperty(a)||b.push(e)});return b},GetFacet:function(a){return this.m_FacetsByName[a]},Clone:function(){return jQuery.extend(!0,{},this)},x_AddFacets:function(a){if(null!=a&&jQuery.isArray(a)){this.m_Facets=a;var b=this.m_FacetsByName={};jQuery.each(a,function(a,d){b[d.GetInternalName()]=d})}}};TMS.AvailableList=function(a){var b=TMS.ValidateConfig(a,["client","resource","assm_acc"]);null!=b&&b.hasOwnProperty("errors")?
TMS.ReportErrors("TMS.AvailableList: ",b.errors):(this.m_TrackLists=[],this.m_Client=a.client,this.m_Resource=a.resource,this.m_Assm_acc=a.assm_acc,b=this.x_Refresh(),a.hasOwnProperty("onReady")&&null!=a.onReady&&jQuery.isFunction(a.onReady)&&b.done(a.onReady),a.hasOwnProperty("promises")&&null!=a.promises&&jQuery.isArray(a.promises)&&a.promises.push(b))};TMS.AvailableList.DefaultTrackListSelector=function(a){return!(a instanceof TMS.NamedTrackList)};TMS.AvailableList.UserTrackListSelector=function(a){return a instanceof
TMS.NamedTrackList||a instanceof TMS.IdTrackList};TMS.AvailableList.NamedTrackListSelector=function(a){return a instanceof TMS.NamedTrackList};TMS.AvailableList.DefaultTrackSelector=function(a){return!0};TMS.AvailableList.DefaultDisplayTrackSelector=function(a){return"true"===a.GetAttr("show")};TMS.AvailableList.UserUploadTrackSelector=function(a){return"Uploaded Data"===a.GetGroup()};var q=function(a){this.m_GetIdFunc=a||function(a){return a};this.m_Ids={};this.m_Arr=[]};q.prototype={AddElements:function(a){var b=
this;jQuery.each(a,function(a,d){var e=b.m_GetIdFunc(d);null==e||b.m_Ids.hasOwnProperty(e)||(b.m_Arr.push(d),b.m_Ids[e]=null)})},GetElements:function(){return this.m_Arr}};var u=function(a){return a.GetTMSId()};TMS.AvailableList.prototype={AddTrackList:function(a){null!=a&&(a instanceof TMS.NamedTrackList||a instanceof TMS.IdTrackList||TMS.LogError("expected named or id track list",a),this.x_AddTrackList(a))},RemoveTrackList:function(a){},GetTrackLists:function(a){a=jQuery.isFunction(a)?a:TMS.AvailableList.UserTrackListSelector;
return this.x_GetTrackListsForSelector(a)},x_GetTrackListsForSelector:function(a){return jQuery.map(this.m_TrackLists,function(b,c){return a(b)?b:null})},GetUnifiedTrackList:function(a,b){var c=function(a,b){return jQuery.isFunction(a)?a:b},d=c(a,TMS.AvailableList.DefaultTrackListSelector),e=c(b,TMS.AvailableList.DefaultTrackSelector),f=new q(u);jQuery.each(this.m_TrackLists,function(a,b){d(b)&&jQuery.each(b.GetTracks(),function(a,b){b.GetTMSId();e(b)&&f.AddElements([b])})});return new k(f.GetElements(),
!1)},SwitchGenomeContext:function(a){},Refresh:function(){return this.x_Refresh()},x_Refresh:function(){var a=this,b=function(b,c,d){a.m_TrackLists.length=0;null!=b&&b.hasOwnProperty("tracks")&&(b=k.FromDispTracksCgi(b.tracks,"tmssvc",this.m_Client,this.m_Resource),jQuery.each(b,function(b,c){a.x_AddTrackList(c)}))},c={client:this.m_Client,resource:this.m_Resource,assm_acc:this.m_Assm_acc},c={dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("disptracks"),data:c,xhrFields:{withCredentials:!0}},
d=new jQuery.Deferred;jQuery.ajax(c).done(function(c,f,g){b(c,f,g);d.resolveWith(a)}).fail(function(b,c,g){c="error refreshing track list ["+c+"]: "+g;TMS.LogError(c);d.rejectWith(a,[b,"",c])});return d.promise()},x_AddTrackList:function(a){null!=a&&this.m_TrackLists.push(a)}};TMS.GetUserTrackList=function(a){if(null==a)return TMS.LogError("TMS.AvailableList: assembly accession not specified"),jQuery.Deferred().reject();jQuery.isArray(a)||(a=[a]);switch(a.length){case 0:return TMS.LogError("TMS.AvailableList: assembly accession not specified"),
jQuery.Deferred().reject();case 1:break;default:a=w(a)}var b=[],c=jQuery.map(a,function(a,c){return new TMS.AvailableList({client:"",resource:"",assm_acc:a,promises:b})}),d=function(a){var b=new q(u);jQuery.each(a,function(a,c){b.AddElements(c.GetUnifiedTrackList().GetTracks())});return new k(b.GetElements(),!1)};return jQuery.when.apply(jQuery,b).pipe(function(){var a=d(c);return jQuery.Deferred().resolveWith(a)})};TMS.DisplayTrackInfo=function(a){this.m_TrackInfo=a};TMS.DisplayTrackInfo.prototype=
{GetName:function(){return null==this.m_TrackInfo?null:this.m_TrackInfo.GetName()},GetTrackInfo:function(){return this.m_TrackInfo},SetDisplayOptions:function(a){this.m_DisplayOptions=null==a||0===a.length?null:jQuery.isArray()?a.join(","):a},GetDisplayOptions:function(){return null!=this.m_DisplayOptions?this.m_DisplayOptions:null==this.m_TrackInfo?null:this.m_TrackInfo.GetDisplayOptions()},GetDataFilters:function(){return null},GetTMSId:function(){return null==this.m_TrackInfo?null:this.m_TrackInfo.GetTMSId()},
GetAttr:function(){return null==this.m_TrackInfo?null:this.m_TrackInfo.GetAttr()},GetGroup:function(){return null==this.m_TrackInfo?null:this.m_TrackInfo.GetGroup()},GetOrdering:function(){return null==this.m_TrackInfo?null:this.m_TrackInfo.GetOrdering()}};TMS.DisplayList=function(a){null!=a?(a=a.GetUnifiedTrackList(null,TMS.AvailableList.DefaultDisplayTrackSelector),this.m_Tracks=jQuery.map(a.GetTracks(),function(a,c){return new TMS.DisplayTrackInfo(a)})):this.m_Tracks=[]};TMS.DisplayList.prototype=
{ClearTracks:function(){this.m_Tracks.length=0},AddTrack:function(a,b){null!=a&&(a instanceof TMS.DisplayTrackInfo||console.error("expected TMS.DisplayTrackInfo",a),b=TMS.Position.ValidatedValue(b),b===TMS.Position.bottom?this.m_Tracks.push(a):this.m_Tracks.unshift(a))},AddTrackRelative:function(a,b,c){if(null!=a&&null!=b&&null!=c&&(c=TMS.Position.ValidatedValue(c),null!=c)){a instanceof TMS.DisplayTrackInfo||console.error("expected TMS.DisplayTrackInfo",a);b instanceof TMS.DisplayTrackInfo||console.error("expected TMS.DisplayTrackInfo",
b);var d=jQuery.inArray(a);-1===d?console.error("track not found in DisplayList",b):(c===TMS.RelativePosition.after&&++d,this.m_Tracks.splice(d,0,a))}},GetTracks:function(a){return Boolean(a)?jQuery.extend([],this.m_Tracks):this.m_Tracks},Clone:function(){var a=new TMS.DisplayList;jQuery.extend(a.m_Tracks,this.m_Tracks)},Assign:function(a){null!=a&&(a instanceof TMS.DisplayList||console.error("expected TMS.DisplayList",a),this.m_Tracks=jQuery.extend([],dl.m_Tracks))},AssignTracks:function(a){null!=
a&&(jQuery.isArray(a)||console.error("expected array of TMS.DisplayTrackInfo",a),this.m_Tracks=jQuery.extend([],a))}};TMS.UploadStatus=UUD.UploadStatus;TMS.FileUploader=UUD.FileUploader;TMS.FileWrapper=UUD.FileUploader;TMS.CreateTrackForDataKey=UUD.CreateTrackForDataKey;"undefined"===typeof MyNCBI&&(MyNCBI={UI:{},internal:{UUD:{}}});var m=function(){this.m_Logged_in=!1};m.prototype={IsLoggedIn:function(){return this.m_Logged_in},SubscribeToChanges:function(a){if(null!=a&&jQuery.isFunction(a))jQuery(this).on("MyNCBI_status_changed",
a)},UnsubscribeToChanges:function(a){null!=a&&jQuery.isFunction(a)&&jQuery(this).off("MyNCBI_status_changed",null,a)},x_NotifyForChanges:function(){jQuery(this).triggerHandler("MyNCBI_status_changed",[this.m_Logged_in])}};MyNCBI.User=new m;var C=function(a){var b=MyNCBI.User.m_Logged_in;MyNCBI.User.m_Logged_in=Boolean(a);b!==MyNCBI.User.m_Logged_in&&MyNCBI.User.x_NotifyForChanges()};TMS.TrackSet=function(a,b,c,d,e){this.m_Id=a;this.x_SetTracks(b);this.x_SetName(e);this.x_SetTrackSetType(c);this.x_SetAssembly(d)};
TMS.TrackSet.prototype=new TMS.NamedTrackList;TMS.TrackSet.prototype.x_SetTrackSetType=function(a){this.m_TrackSetType=TMS.TrackSetType.ValidatedValue(a)};TMS.TrackSet.prototype.x_SetAssembly=function(a){this.m_Assembly=a};TMS.TrackSet.prototype.GetAssembly=function(){return this.m_Assembly};TMS.TrackSet.prototype.GetTrackSetType=function(){return this.m_TrackSetType};TMS.TrackSet.prototype.GetId=function(){return this.m_Id};m=function(){this.x_Reset()};m.prototype={SetAssembly:function(a){if(null!=
this.m_AssmCheckPromise){if(a===this.m_PendingAssembly)return this.m_AssmCheckPromise.promise();c.x_RejectPromise(this.m_AssmCheckPromise,TMS.TrackSetStatus.supplanted,"SetAssembly: "+this.m_PendingAssembly+" supplanted by "+a);this.m_PendingAssembly=this.m_AssmCheckPromise=null}var b=new jQuery.Deferred;if(null==a)return this.m_Assembly=null,this.x_Reset(),TMS.trackset_enable_polling&&null!=this.m_Interval_id&&(cancelInterval(this.m_Interval_id),this.m_Interval_id=null),this.x_RejectPromise(b,TMS.TrackSetStatus.assembly_null,
"Assembly must be specified").promise();if(a===this.m_Assembly)return this.x_ResolvePromise(b,TMS.TrackSetStatus.unchanged).promise();this.m_PendingAssembly=a;this.m_AssmCheckPromise=b;this.x_Reset();var c=this;this.x_VerifyAssembly(a).always(function(){c.m_AssmCheckPromise=null;c.m_PendingAssembly=null}).done(function(){"rejected"!==b.state()&&(c.m_Assembly=a,c.GetTracksets().done(function(a,e){c.x_ResolvePromise(b,TMS.TrackSetStatus.setassembly_gettracksets)}),TMS.trackset_enable_polling&&null==
this.m_Interval_id&&(c.m_Interval_id=setInterval(function(){c.GetTracksets(!0)},TMS.trackset_poll_interval)))}).fail(function(){c.m_Assembly=null;c.x_RejectPromise(b,TMS.TrackSetStatus.trackset_not_retrieved,"Unable to retrieve TrackSet for "+a)});return b.promise()},x_VerifyAssembly:function(a){var b=new jQuery.Deferred;jQuery.ajax({dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("supportedassm"),xhrFields:{withCredentials:!0},data:{assm:a}}).done(function(a,d,e){a.is_supported?
b.resolve():b.reject()}).fail(function(a,d,e){b.reject()});return b.promise()},x_Reset:function(){null!=this.m_Tracksets&&(this.m_PriorTracksets=this.m_Tracksets);this.m_TSPromise=this.m_Tracksets=null},x_ResolvePromise:function(a,b){return a.resolveWith(this,[this.m_Tracksets,b])},x_RejectPromise:function(a,b,c){return a.rejectWith(this,[c,b])},GetTracksets:function(a){if(null!=this.m_AssmCheckPromise){var b=this,c=new jQuery.Deferred;this.m_AssmCheckPromise.done(function(){b.x_ResolvePromise(c,
TMS.TrackSetStatus.gettracksets_pending_setassembly)});return c.promise()}null!=a&&a&&null==this.m_TSPromise&&this.x_Reset();null!=this.m_Tracksets&&(this.m_PriorTracksets=this.m_Tracksets);return this.x_RetrieveTracksets(this.m_Assembly)},CreateTrackset:function(a,b,c){var d=new jQuery.Deferred;if(null==this.m_Assembly||null==b)return d.reject(),d.promise();if(!jQuery.isArray(b))if(b instanceof k)b=b.GetTracks();else if(b instanceof TMS.DisplayList)b=b.GetTracks(!1);else return TMS.LogError("TMS.TrackInfo/DisplayTrackInfo array, TMS.TrackList or TMS.DisplayList expected"),
d.reject(),d.promise();if(null==a||0===a.length)a="Unnamed TrackSet";var e=this,f=function(b){TMS.LogError("TrackSetService.CreateTrackSet: "+("Error creating trackset "+a+" for assembly ["+e.m_Assembly+"]"));null!=b&&jQuery.isArray(b)&&jQuery.each(b,function(a,b){switch(b.level){case "error":TMS.LogError("TrackSetService.CreateTrackSet: "+b.message);break;case "info":TMS.LogInfo("TrackSetService.CreateTrackSet: "+b.message)}});d.reject()};b=jQuery.map(b,function(a,b){var c=a instanceof TMS.DisplayTrackInfo?
a.GetDisplayOptions():a instanceof TMS.TrackInfo?(new TMS.DisplayTrackInfo(a)).GetDisplayOptions():null;return null==c?a.GetTMSId():a.GetTMSId()+":"+D(c)});if(0===b.length)return f(["Cannot create trackset for empty track list"]),d.promise();jQuery.ajax({dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("createtrackset"),xhrFields:{withCredentials:!0},data:{name:a,assm:this.m_Assembly,ids:b.join(",")}}).done(function(a,b,c){"failure"==a.status?f(a.messages):e.GetTracksets(!0).always(function(){d.resolve(a.trackset_id)})}).fail(function(a,
b,c){f([c])});return d.promise()},SubscribeToChanges:function(a){if(null!=a&&jQuery.isFunction(a))jQuery(this).on("tracksets_changed",a)},UnsubscribeToChanges:function(a){null!=a&&jQuery.isFunction(a)&&jQuery(this).off("tracksets_changed",null,a)},x_NotifyForChanges:function(){console.log("triggering tracksets_changed event");jQuery(this).triggerHandler("tracksets_changed",[this.m_Tracksets])},x_RetrieveTracksById:t,x_TracksetsDiffer:function(a,b){var c=function(a){return jQuery.map(a,function(a,
b){return a.GetId()}).join("%$#@")};return null==a||null==b||a.length!==b.length?!0:c(a)!==c(b)},x_ProcessTracksets:function(a,b){try{C(a.has_active_myncbi_session);var c={},d=this,e=function(a,b){return jQuery.map(a,function(a,c){if(a instanceof TMS.DisplayTrackInfo)return a;var d=TMS.TrackMgr.GetTrack("TMS",TMS.TrackInfo.ExtractTMSId(a));if(null==d&&!b)return a;var e=new TMS.DisplayTrackInfo(d);a.hasOwnProperty("attrs")&&null!=a.attrs&&jQuery.isArray(a.attrs)&&0<a.attrs.length&&jQuery.each(a.attrs,
function(a,b){"display_options"==b.key&&e.SetDisplayOptions(b.value)});return e})},f=[],g=[];jQuery.each(a.tracksets.tracksets,function(a,b){var h=b.id,k=TMS.TrackSets.cache.Get(h);null==k&&(jQuery.each(b.tracks,function(a,b){var c=TMS.TrackInfo.ExtractTMSId(b).match(/(.*?):(.*)/);null!=c&&(b.dtrack_id.tag.str=c[1],0<c[2].length&&(b.hasOwnProperty("attrs")||(b.attrs=[]),b.attrs.push({key:"display_options",value:E(c[2])})))}),k=new TMS.TrackSet(h,e(b.tracks,!1),b.type,d.m_Assembly,b.name),TMS.TrackSets.cache.Store(h,
k));jQuery.each(k.GetTracks(),function(a,b){if(!(b instanceof TMS.DisplayTrackInfo)){var d=TMS.TrackInfo.ExtractTMSId(b);c[d]=!0}});(k.GetTrackSetType()===TMS.TrackSetType.myNCBI_Collection?f:g).push(k)});g.sort(function(a,b){return a.GetName().localeCompare(b.GetName())});var h=g.concat(f),k=this.x_TracksetsDiffer(h,this.m_PriorTracksets);this.m_Tracksets=h;var n=function(){d.x_ResolvePromise(b,TMS.TrackSetStatus.gettracksets);k&&d.x_NotifyForChanges()},l=jQuery.map(c,function(a,b){return b});0<
l.length?this.x_RetrieveTracksById(l).done(function(){jQuery.each(d.m_Tracksets,function(a,b){b.x_SetTracks(e(b.GetTracks(),!0),!1)})}).always(function(){n()}):n()}catch(m){console.log("Exception in TMS.TrackSet.x_ProcessTracksets",m),d.x_RejectPromise(b,TMS.TrackSetStatus.error,"Exception in TMS.TrackSet.x_ProcessTracksets")}},x_RetrieveTracksets:function(a){if(null!=this.m_TSPromise){if(a===this.m_TSPendingAssembly)return this.m_TSPromise.promise();this.x_RejectPromise(this.m_TSPromise,TMS.TrackSetStatus.supplanted,
"GetAssembly: "+this.m_TSPendingAssembly+" supplanted by "+a);this.m_TSPendingAssembly=this.m_TSPromise=null}var b=new jQuery.Deferred;if(null==a)return this.x_RejectPromise(b,TMS.TrackSetStatus.assembly_null,"assembly parameter must not be null").promise();if(null!=this.m_Tracksets)return this.x_ResolvePromise(b,TMS.TrackSetStatus.cached_tracksets).promise();this.m_TSPendingAssembly=a;this.m_TSPromise=b;var c=this,d={dataType:"json",async:!0,type:"POST",processData:!0,url:TMS.GetCgiUrl("retrievetracksets"),
xhrFields:{withCredentials:!0},data:{assm:a}};jQuery.ajax(d).done(function(a,d,g){c.x_ProcessTracksets(a,b)}).fail(function(d,f,g){d="error retrieving tracksets for assembly ["+a+"]: "+g;TMS.LogError(d);c.x_RejectPromise(b,TMS.TrackSetStatus.error,d)}).always(function(){c.m_TSPromise=null;c.m_TSAssembly=null});return b.promise()}};TMS.TrackSets={TrackSetService:new m,GetDefaultTrackSet:function(a,b,c){var d=new jQuery.Deferred;if(null==a||null==b||null==c)return d.reject().promise();var e="__AppDefault__"+
a+"__"+b+"__"+c,f=TMS.TrackSets.dflt_cache.Get(e);if(null!=f)return d.resolveWith(f).promise();new TMS.AvailableList({client:a,resource:b,assm_acc:c,onReady:function(){var a=(new TMS.DisplayList(this)).GetTracks(!0);0!==a.length?(a.sort(function(a,b){return a.GetOrdering()-b.GetOrdering()}),a=new TMS.TrackSet(e,a,TMS.TrackSetType.DefaultTrackSet,c,"Default tracks"),TMS.TrackSets.dflt_cache.Store(e,a),d.resolveWith(a)):d.reject()}});return d.promise()},cache:new l,dflt_cache:new l,dispopts_strtag_map:null,
dispopts_tagstr_map:null};jQuery.getJSON(TMS.base_path+TMS.myncbi_js_path+"dopt.js",function(a){var b=TMS.TrackSets.dispopts_strtag_map={},c=TMS.TrackSets.dispopts_tagstr_map={};jQuery.each(a,function(a,e){b[e.dopt]=e.tag;c[e.tag]=e.dopt})});var E=function(a){for(var b=/([A-Z][a-z]*)(\^.+?\^)?/g,c=/(.+?)\^(.+?)\^/,d=[];null!=(res=b.exec(a));){var e=res[0],f=e.match(c);null!=f&&3===f.length?d.push(TMS.TrackSets.dispopts_tagstr_map[f[1]]+f[2]):TMS.TrackSets.dispopts_tagstr_map.hasOwnProperty(res[0])?
d.push(TMS.TrackSets.dispopts_tagstr_map[res[0]]):TMS.LogError("internal error: Unrecognized display setting ["+e+"]")}return d.join(",")},D=function(a){return jQuery.map(a.split(","),function(a,c){if(0===a.length)return null;if(TMS.TrackSets.dispopts_strtag_map.hasOwnProperty(a))return TMS.TrackSets.dispopts_strtag_map[a];var d=a.match(/(.*?):(.*)/);return null!=d&&3===d.length&&0<d[2].length&&TMS.TrackSets.dispopts_strtag_map.hasOwnProperty(d[1]+":")?TMS.TrackSets.dispopts_strtag_map[d[1]+":"]+
"^"+d[2]+"^":null}).join("")};TMS.UI.AvailableList=function(a,b){this.m_AvailableList=a;this.m_Accordion=jQuery(b);this.x_AddTracks();jQuery(b).accordion({collapsible:!1,fillSpace:!1})};TMS.UI.AvailableList.prototype.x_AddTracks=function(){var a={},b=[];jQuery.each(this.m_AvailableList.GetUnifiedTrackList().GetTracks(),function(c,e){var f=e.GetGroup(),g=a[f];null==g&&(g=a[f]={name:f,order_by:jQuery.isFunction(e.GetAttr)?e.GetAttr("group_order_by"):Number.MAX_VALUE,tracks:[]},b.push(g));g.tracks.push(e)});
b.sort(function(a,b){return a.order_by-b.order_by});var c=this.m_Accordion;jQuery.each(b,function(a,b){jQuery("<h3>").append(b.name).appendTo(c);var f=jQuery("<div>").attr("data-section",b.name).attr("data-order",b.order_by).addClass("tracks-by-type").appendTo(c);b.tracks.sort(function(a,b){return a.GetOrdering()-b.GetOrdering()});jQuery.each(b.tracks,function(a,b){jQuery("<div>").append(b.GetName()).addClass("track").appendTo(f)})})}})(jQuery);

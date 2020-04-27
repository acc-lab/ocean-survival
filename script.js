var canvas=document.getElementById("frame");

canvas.width=480;
canvas.height=360;

var ctx=canvas.getContext("2d");

var store={};

function loadImage(filename, cofilename){
    var image = new Image();
    image.src=filename+cofilename;
    image.onload=function(){
        store[filename]=image;
    }
}

loadImage("floor", ".svg");

function withFloor(bx,by){
    return Object.keys(floors).includes(''+bx+' '+by);
}

function parseB(cx,cy){
    return [Math.floor(cx/30)+1, Math.floor(cy/30)+1]
}


function drawCharacter(x,y,dir){
    let sin=Math.sin(dir*(Math.PI/180));
    let cos=Math.cos(dir*(Math.PI/180));


    ctx.strokeStyle="#ffffff";
    ctx.fillStyle="#ffffff";
    ctx.beginPath();
    ctx.arc(x-6*cos, y+6*sin, 5, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.strokeStyle="#000000";
    ctx.fillStyle="#000000";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x+11*cos+5*sin, y-11*sin+5*cos, 2, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x+11*cos-5*sin, y-11*sin-5*cos, 2, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

    ctx.strokeStyle="#ffffff";
    ctx.fillStyle="#ffffff";
    ctx.beginPath();
    ctx.arc(x-Math.cos(dir*(Math.PI/180)), y+Math.sin(dir*(Math.PI/180)), 4, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fill();

}

function touched(a,b){
    //a,b: rectangle is a array with 4 terms. That is, [x0, y0, width, height]

    return (a[0] < b[0] + b[2] &&
        a[0] + a[2] > b[0] &&
        a[1] < b[1] + b[3] &&
        a[1] + a[3] > b[1]) 
}

var floors={};

class Floor{
    constructor(bx, by){
        this.bx=bx;
        this.by=by;
        this.onCursor=false;
    }
    updateOnCursor(cx,cy){
        this.onCursor=touched([this.bx*30-30, this.by*30-30, 30, 30], [cx, cy, 0, 0]);
    }
    draw(){
        ctx.save();
        if(this.onCursor){
            ctx.globalAlpha=0.5;
        }
        ctx.drawImage(store['floor'], this.bx*30-30, this.by*30-30);
        ctx.restore();
    }
}

class Way{
    constructor(bx,by,path=[],coord="DEFAULT"){
        this.x=bx;
        this.y=by;
        this.path=path;
		
		if(coord=="DEFAULT"){
			this.coord=[[0,0]];
			
			let cmd;
			let lastcoord;
			
			for(i=0;i<this.path.length;i++){
				cmd=this.path[i];
				
				lastcoord=this.coord[this.coord.length-1];
				
				switch(cmd){
					case "l": this.coord.push([lastcoord[0]-1,lastcoord[1]]); break;
					case "r": this.coord.push([lastcoord[0]+1,lastcoord[1]]); break;
					case "u": this.coord.push([lastcoord[0],lastcoord[1]-1]); break;
					case "d": this.coord.push([lastcoord[0],lastcoord[1]+1]); break;
				}
			}
		}else{
			this.coord=coord;
		}
    }
    getMix(command){
        let x=this.x+0;
        let y=this.y+0;
        let path=this.path.slice();
		let coord=this.coord.slice();
		
		let lastcoord=coord[coord.length-1];

        if(command=="l"){
            x-=1;
			coord.push([lastcoord[0]-1,lastcoord[1]]);
			
        }if(command=="r"){
            x+=1;
			coord.push([lastcoord[0]+1,lastcoord[1]]);
			
        }if(command=="u"){
            y-=1;
			coord.push([lastcoord[0],lastcoord[1]-1]);
			
        }if(command=="d"){
            y+=1;
			coord.push([lastcoord[0],lastcoord[1]+1]);
        }

        path.push(command);

        let new_way = new Way(x,y,path,coord);

        return new_way;
    }
    get abs_length(){
        let ge=0;
        for(i=0;i<this.path.length-1;i++){
            if(this.path[i]!=this.path[i+1]){
                ge+=1;
            }
        }
        return ge;
    }
    get_abs_length(dir){
        let sign;
        switch(dir){
            case 0:sign="r";break;
            case 90:sign="u";break;
            case 180:sign="l";break;
            case 270:sign="d";break;
        }

        let n_path = new Way(1, 1, [sign].concat(this.path),[]);
        return n_path.abs_length;
    }
	get check_unnecessary_step(){
		let lastcoord=this.coord[this.coord.length-1];
		
		let flag=false;
		
		for(i=0;i<this.coord.length-1;i++){
			if(lastcoord[0]==this.coord[i][0] && lastcoord[1]==this.coord[i][1]){
				flag=true;
				break;
			}
		}
		
		return flag;
	}
}

class Player{
    constructor(bx,by){
        this.x=bx*30-15;
        this.y=by*30-15;
        this.direction=0;
        this.running=false;
        this.running_path=[];

        this.doing=null;
        this.doing_mode=0;
        this.doing_timing=0;
    }
    commandToDirection(cmd){
        switch(cmd){
            case 'r': return 0;
            case 'l': return 180;
            case 'u': return 90;
            case 'd': return 270;
        }
    }
    compile_run(bx,by){
        let direction;

        if(45<=this.direction && this.direction<315){
            direction=90*Math.round(this.direction/90);
        }else{
            direction=0;
        }

        this.running_path=this.pathFind(bx,by,direction);
		
		if(this.running_path!="FAILED"){
			this.running=true;
			
			this.doing=this.commandToDirection(this.running_path.splice(0,1)[0]);

			this.doing_mode=-1;
			this.doing_timing=3;
		}else{
			this.running_path=[];
		}
    }
    doMovement(){
        if(this.doing_mode==-1){
            if(Math.abs(this.direction-this.doing)<=180){
                this.direction-=(this.direction-this.doing)/this.doing_timing;
            }else if(this.direction-this.doing<-180){
                this.direction+=(this.doing-(this.direction+360))/this.doing_timing;
            }else{
                this.direction+=(this.doing+360-this.direction)/this.doing_timing;
            }

            this.direction=this.direction%360<0?this.direction%360+360:this.direction%360;

            this.doing_timing-=1;

            if(this.doing_timing==0){
                this.doing_mode=1;
                this.doing_timing=5;
            }

        }else if(this.doing_mode==1){
            if(this.doing==0){
                this.x+=6;
            }else if(this.doing==180){
                this.x-=6;
            }else if(this.doing==90){
                this.y-=6;
            }else{
                this.y+=6;
            }
            this.doing_timing-=1;
            if(this.doing_timing==0){
                if(this.running_path.length==0){
                    this.running=false;
                }else{
                    this.doing=this.commandToDirection(this.running_path.splice(0,1)[0]);

                    if(this.doing-this.direction!=0){
                        this.doing_mode=-1;
                        this.doing_timing=3;
                    }else{
                        this.doing_mode=1;
                        this.doing_timing=5;
                    }
                }
            }
        }
    }
    pathFind(bx,by,direction){
        let coord=parseB(this.x, this.y);
        let x=coord[0];
        let y=coord[1];

        let ways=[];
        let new_ways=[];

        function getConnect(x_,y_){
            let re=[];
            if(withFloor(x_+1,y_)){
                re.push('r');
            }if(withFloor(x_-1,y_)){
                re.push('l');
            }if(withFloor(x_,y_+1)){
                re.push('d');
            }if(withFloor(x_,y_-1)){
                re.push('u');
            }
            return re;
        }

        function contradict(a,b){
            return (a=="u" && b=="d")||(a=="d" && b=="u")||(a=="l" && b=="r")||(a=="r" && b=="l");
        }

        let orgin = new Way(x,y);
        ways.push(orgin);

        let way;

        let addPath;

        let i,j,m;

        let run=true;

        let short_path=[];
		
		let failed=false;
		
		let runtime=0;
		
		let newPath;

        while(short_path.length==0 && !failed){
			runtime+=1;
			
            for(i=0;i<ways.length;i++){
                way=ways[i];

                addPath=getConnect(way.x, way.y);

                for(j=0;j<addPath.length;j++){
					newPath=way.getMix(addPath[j]);
					
					if(!newPath.check_unnecessary_step){					
						if(way.path.length==0){
							new_ways.push(newPath);
						}
						else if(!contradict(way.path[way.path.length-1],addPath[j])){
							new_ways.push(newPath);
						}
					}
                }
            }
			
            ways=new_ways;
            new_ways=[];
			
			console.log(runtime, ways.length);
			
			if(ways.length>=3000 || runtime>=150){
				failed=true;
			}else{
				for(i=0;i<ways.length;i++){
					if(ways[i].x==bx && ways[i].y==by){
						short_path.push(ways[i]);
					}
				}
			}
        }
	
		if(failed){
			return "FAILED";
		}else{
			let shortest_path=short_path[0];

			for(i=0;i<short_path.length;i++){
				if(short_path[i].get_abs_length(direction)<shortest_path.get_abs_length(direction)){
					shortest_path=short_path[i];
				}
			}

			return shortest_path.path;
		}
    }
}

function new_floor(bx,by){
    nfloor = new Floor(bx,by);

    floors[(''+bx)+' '+by]=nfloor;
}

var player = new Player(9,6);

MAP=[[8,6],[8,7],[9,6],[9,7],[10,6],[11,6],[11,7],[11,8],[10,8],[10,9],[9,9],[8,9],[7,9],[7,8],[6,8],[6,7],[6,6],[6,5],[7,5],
[7,4],[8,4],[9,4],[11,4],[10,4],[12,4],[13,5],[12,5],[13,6],[13,7],[13,8],[13,9],[12,9],[12,10],[11,10],[11,11],[11,12],[12,12],
[13,12],[13,11],[14,11],[15,11],[16,11],[16,10],[16,9],[15,9],[15,8],[15,7],[16,7],[16,6],[16,5],[15,5],[15,4],[14,4],[14,3],
[15,3],[15,2],[15,1],[14,1],[13,1],[13,2],[12,2],[11,2],[11,1],[10,1],[9,1],[9,2],[8,2],[7,2],[7,1],[6,1],[5,1],[5,2],[4,2],
[3,2],[3,1],[2,1],[1,1],[1,2],[1,3],[2,3],[2,4],[3,4],[4,4],[4,5],[4,6],[3,6],[2,6],[1,6],[1,7],[2,7],[1,8],[1,9],[2,9],
[3,9],[3,8],[5,8],[4,8],[4,9],[4,10],[4,11],[3,11],[2,11],[2,12],[5,11],[6,11],[7,11],[9,11],[9,12],[8,12],[7,12]]

for(i=0;i<MAP.length;i++){
	new_floor(MAP[i][0],MAP[i][1]);
}

function update(){
    if(Object.keys(store).length==1){
        ctx.clearRect(0,0,480,360);

        for(i=0;i<Object.keys(floors).length;i++){
            floor=floors[Object.keys(floors)[i]];

            floor.updateOnCursor(cursor_x, cursor_y);
            floor.draw();
        }

        drawCharacter(player.x,player.y,player.direction);

        if(!player.running){
            player.direction=Math.atan2(player.y-cursor_y, cursor_x-player.x)*(180/Math.PI);
            if(player.direction<0) player.direction+=360;

            if(cursor_click){
                re=parseB(cursor_x, cursor_y);
                bx=re[0];
                by=re[1];
                if(withFloor(bx,by)){
                    player.compile_run(bx,by);
                }else{
					new_floor(bx,by);
				}

                cursor_click=false;
            }

        }else{
            player.doMovement();
        }
    }
}

setInterval(update, 30);

var cursor_x;
var cursor_y;

//cursor's click
var cursor_click=false;


//if the mouse is moved, update new cursor coordinate
document.onmousemove=function(e) {
    cursor_x = event.clientX - canvas.offsetLeft + 240;
    cursor_y = event.clientY - canvas.offsetTop;
}

//if mouse down, set cursor_click to true, so in the next game tick the mainloop function can detect
canvas.addEventListener('mousedown',function(){
    cursor_click=true;
})
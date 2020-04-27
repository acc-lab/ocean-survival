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
    constructor(bx,by,path=[]){
        this.x=bx;
        this.y=by;
        this.path=path;
    }
    getMix(command){
        let x=this.x+0;
        let y=this.y+0;
        let path=this.path.slice();

        if(command=="l"){
            x-=1;
        }if(command=="r"){
            x+=1;
        }if(command=="u"){
            y-=1;
        }if(command=="d"){
            y+=1;
        }

        path.push(command);

        let new_way = new Way(x,y,path);

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

        console.log(dir,sign);

        let n_path = new Way(1, 1, [sign].concat(this.path));
        return n_path.abs_length;
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

        this.running=true;
        this.running_path=this.pathFind(bx,by,direction);

        this.doing=this.commandToDirection(this.running_path.splice(0,1)[0]);

        this.doing_mode=-1;
        this.doing_timing=3;
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

                    console.log(this.doing, this.direction);

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

        while(short_path.length==0){
            for(i=0;i<ways.length;i++){
                way=ways[i];

                addPath=getConnect(way.x, way.y);

                for(j=0;j<addPath.length;j++){
                    if(way.path.length==0){
                        new_ways.push(way.getMix(addPath[j]));
                    }
                    else if(!contradict(way.path[way.path.length-1],addPath[j])){
                        new_ways.push(way.getMix(addPath[j]));
                    }
                }
            }
            ways=new_ways;
            new_ways=[];

            for(i=0;i<ways.length;i++){
                if(ways[i].x==bx && ways[i].y==by){
                    short_path.push(ways[i]);
                }
            }
        }

        let shortest_path=short_path[0];

        for(i=0;i<short_path.length;i++){
            console.log(short_path[i], short_path[i].get_abs_length(direction), direction);
            if(short_path[i].get_abs_length(direction)<shortest_path.get_abs_length(direction)){
                shortest_path=short_path[i];
            }
        }

        return shortest_path.path;
    }
}

function new_floor(bx,by){
    nfloor = new Floor(bx,by);

    floors[(''+bx)+' '+by]=nfloor;
}

var player = new Player(9,6);

new_floor(8,6);
new_floor(8,7);
new_floor(9,6);
new_floor(9,7);

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
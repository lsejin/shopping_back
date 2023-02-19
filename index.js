import express from "express";
import * as mysql from 'mysql2/promise';
import crypto from "crypto";
import cors from "cors";
import CryptoJS from 'crypto-js';
import { exit } from "process";
//import { exit } from "process";

const app = express();
app.use(express.json());
app.use(cors({
    origin : "http://localhost:3000"
}))
const port = 7070;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

//회원가입
app.post("/join", async (req, res) => {
    try{
        const name = req.body.name;
        const tel = req.body.tel;
        const adress = req.body.adress;
        const birth = req.body.birth;
        const email = req.body.email;
        const password = req.body.password;

        const bytes = CryptoJS.AES.decrypt(password, "secretKey");      //"secretKey" 환경변수로 이동
        const password_des = bytes.toString(CryptoJS.enc.Utf8).toString();

        const conn = await mysql.createConnection({
            host : '127.0.0.1',
            user : 'root',
            password : 'ampdb',
            database : 'test',
            port : 9906
        });
        

        const check = await CheckEmail({email});

        if(check) {
            return res.send({
                success : false,
                message : '이미 존재하는 회원입니다.',
            })
        }

        crypto.randomBytes (64, (err, buf) => {
            const salt = "a1234";      //"salt" 환경변수로 이동    
            crypto.pbkdf2(password_des, salt, 100000, 16, 'md5', async (err, key) =>{
                await conn.execute(
                    `INSERT user (name, tel, adress, birth, email, password) VALUES (?, ?, ?, ?, ?, ?)`,
                    [name, tel, adress, birth, email, key.toString('base64')]
                )
            });
        });

        return res.send({
            success : true,
            message : '회원가입에 성공하였습니다.',
        })
    }catch(e) {
        console.log(e);
        return res.send({
            success : false,
            message : '시스템 오류로 회원가입에 실패하였습니다.',
        })
    }
});


//로그인
app.post("/login", async (req, res) => {
    try{
        const email = req.body.email;
        const password = req.body.password;

        const bytes = CryptoJS.AES.decrypt(password, "secretKey");      //"secretKey" 환경변수로 이동
        const password_des = bytes.toString(CryptoJS.enc.Utf8).toString();

        const conn = await mysql.createConnection({
            host : '127.0.0.1',
            user : 'root',
            password : 'ampdb',
            database : 'test',
            port : 9906
        });

        if(!await CheckEmail({email})) {
            return res.send({
                success : false,
                message : '존재하는 않는 회원입니다. 회원가입 후 이용부탁드립니다~',
            })
        }

        crypto.randomBytes (64, (err, buf) => {
            const salt = "a1234";      //"salt" 환경변수로 이동   
            crypto.pbkdf2(password_des, salt, 100000, 16, 'md5', async (err, key) =>{

                const [rows] = await conn.execute(
                    'SELECT email FROM user WHERE email = ? AND password = ?',
                    [email, key.toString('base64')],
                );
        
                if(rows.length === 0) {
                    return res.send({
                        success : false,
                        message : `비밀번호가 틀립니다. 다시 확인 후 입력부탁드립니다.`
                    });
                }
        
                return res.send({
                    success : true,
                    message : '로그인에 성공하였습니다.',
                });
            });
        });  
    }catch(e) {
        console.log(e);
        return res.send({
            success : false,
            message : '시스템 오류로 로그인에 실패하였습니다.',
        }); 
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

//회원검사
async function CheckEmail({email}) {
    const conn = await mysql.createConnection({
        host : '127.0.0.1',
        user : 'root',
        password : 'ampdb',
        database : 'test',
        port : 9906
    });

    const [rows] = await conn.execute(
        'SELECT email FROM user WHERE email = ?',
        [email],
    );

    if(rows.length !== 0) {
        return true;
    }
    return false;
}
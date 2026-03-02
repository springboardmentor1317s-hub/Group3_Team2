import { Component } from '@angular/core';
import {AuthService} from '../services/auth.service';
import {Router}  from  '@angular/router';
@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginData = {email:'',password:''};
  constructor(private auth: AuthService)
  {}

  login(){
    this.auth.login(this.credentials.subscribe({
      next: (res: any) =>{
        localStorage.setItem("token", res.token);
        alert("login successful");
      } ,
    error: err => alert("Invalid login")   });
    }
  }
  /*onLogin(){
    this.auth.loginUser(this.loginData).subscribe(
      (res: any) => {
      this.auth.saveToken(Response.token);
      
      if(Response.role === 'admin'){
        this.router.navigate(['/admin-dashboard']);
      }else{
        this.router.navigate(['/user-dashboard']);
      }
    },
    (err: any) => {
      console.error(err);
      alert("Invalid Credentials");
    }
    );
  }

}

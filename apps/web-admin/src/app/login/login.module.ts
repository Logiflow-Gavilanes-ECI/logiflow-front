import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { LoginPage } from './login.page';
import { LoginPageRoutingModule } from './login-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, LoginPageRoutingModule],
  declarations: [LoginPage],
})
export class LoginPageModule {}

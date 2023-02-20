import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SolarSystemComponent } from './solar-system.component';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: SolarSystemComponent
  }
]

@NgModule({
  declarations: [
    SolarSystemComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class SolarSystemModule { }

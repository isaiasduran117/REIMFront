
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ManiobraService } from '../../maniobras/maniobra.service';
import { MantenimientoComponent } from '../../maniobras/mantenimientos/mantenimiento.component';
import {MantenimientoService} from '../../../services/service.index'
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

@Component({
  selector: 'mantenimientos2',
  templateUrl: './mantenimientos2.component.html',
})

export class Mantenimientos2Component implements OnInit {

  listaMantenimientos;

  constructor(
    private _mantenimientoService: MantenimientoService,
    private activatedRoute: ActivatedRoute, 
    private router: Router,
    private _maniobraService: ManiobraService,
    public matDialog: MatDialog) { }

  ngOnInit() {
    // if (this.usuarioService.usuario.role !== ROLES.ADMIN_ROLE) {
    //   if (this.usuarioService.usuario.role !== ROLES.PATIOADMIN_ROLE) {
    //     this.router.navigate(['/']);
    //   }
    // }
    
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    
    this.cargarManiobra(id);

    
  }

  cargarManiobra(id: string) {
    // this.cargando = true;
    // this.maniobraService.getManiobra(id).subscribe(maniob => {

    // });
    // this.cargando = false;
  }

  
  guardaCambios() {
    // if (this.regForm.valid) {
    //   this._maniobraService.actualizaDetalleManiobra(this.regForm.value).subscribe(res => {
    //     this.regForm.markAsPristine();
    //   });
    // }
  }



  cargaMantenimientos(id:string): void {
    this._mantenimientoService.getMantenimientosxManiobra(id).subscribe(mantenimientos => {
      this.listaMantenimientos = mantenimientos.mantenimientos;
    });

  }
  openDialogMantenimiento(id: string) {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = {_id:id,maniobra:this.regForm.get('_id').value};
    const dialogRef = this.matDialog.open(MantenimientoComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(detalle => {
      if (detalle) {
        this.cargaMantenimientos(this.regForm.get('_id').value);
      }
    });
  }

  removeMantenimiento(id: string) {
    this._mantenimientoService.eliminaMantenimiento(id).subscribe(mantenimientos => {
      this.cargaMantenimientos(this.regForm.get('_id').value);
    });
  }

}

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpEventType } from '@angular/common/http';
import { URL_SERVICIOS } from '../../../../environments/environment';
import { UsuarioService } from '../../usuarios/usuario.service';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import swal from 'sweetalert';
import { FileItem } from '../../../models/file-item.models';
import { Mantenimiento } from './mantenimiento.models';


@Injectable()
export class MantenimientoService {
  
  mantenimiento: Mantenimiento;
  constructor(
    public http: HttpClient,
    public _usuarioService: UsuarioService
    
  ) { }


  guardarMantenimiento(mantenimiento: Mantenimiento): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/mantenimiento';
    if (mantenimiento._id) {
      // actualizando
      url += '/' + mantenimiento._id;
      url += '?token=' + this._usuarioService.token;
      
      return this.http.put(url, {mantenimiento}).pipe(
        map((resp: any) => {
          swal('Mantenimiento Actualizado', mantenimiento.tipoMantenimiento, 'success');
          return resp.mantenimiento;
        })
      );
    } else {
      // creando
      url += '?token=' + this._usuarioService.token;
      return this.http.post(url,{mantenimiento}).pipe(
        map((resp: any) => {
          swal('Mantenimiento Creado', mantenimiento.tipoMantenimiento, 'success');
          return resp.mantenimiento;
        })
      );
    }
  }

  eliminaMantenimiento(idMantenimiento: string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/mantenimiento/' + idMantenimiento;
    url += '?token=' + this._usuarioService.token;
    return this.http.delete(url )
      .pipe(map((resp: any) => {
        swal('Mantenimiento Eliminado', 'success');
        return resp;
      }));
  }

  getMantenimientos(idManiobra: string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/xmaniobra/' + idManiobra;
    url += '?token=' + this._usuarioService.token;
    return this.http.get(url);
  }
  
  getMantenimientosxTipo(tipo: string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/xtipo/' + tipo;
    url += '?token=' + this._usuarioService.token;
    return this.http.get(url);
  }

  getMantenimiento(idMantenimiento: string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/mantenimiento/' + idMantenimiento
    url += '?token=' + this._usuarioService.token;
    return this.http.get(url);
  }

  getFotos(id: string, a_d: string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/mantenimiento/' + id + '/fotos/' +a_d + '/';
    url += '?token=' + this._usuarioService.token;
    return this.http.get(url);
  }

  getFotosAntes(id: string): Observable<any> {
    return this.getFotos(id,'ANTES');
  }
  getFotosDespues(id: string): Observable<any> {
    return this.getFotos(id,'DESPUES');
  }

  subirFotos(imagenes: FileItem[], tipo: string, id: string) {
    return new Promise((resolve, reject) => {
      let j = 0;
      for (const item of imagenes) {
        console.log(item);
        const formData = new FormData();
        formData.append('file', item.archivo, item.nombreArchivo);
        const url = URL_SERVICIOS + '/mantenimientos/mantenimiento/' + id + '/upfoto/' + tipo + '/?token=' + this._usuarioService.token;
        
        this.http.put( url, formData, {reportProgress: true, observe: 'events'} )
        .subscribe(event => {
          if (event.type === HttpEventType.UploadProgress) {
            item.progreso = Math.round( (event.loaded / event.total * 100) - 20);
          } else if (event.type === HttpEventType.Response) {
            j++;
            item.progreso = 100;
            if (j >= imagenes.length) {
              resolve(true);
            }
          }
        });
      }
    });
  }

  eliminaFoto(id:string,AD:string,nameimg: string) {
    return new Promise((resolve, reject) => {
      const url = URL_SERVICIOS + '/mantenimientos/mantenimiento/'+id+'/eliminaFoto/' + AD +'/'+ nameimg+ '/?token=' + this._usuarioService.token;
      this.http.get(url).subscribe(event => {
        resolve(true);
        // if (event.type === HttpEventType.Response) {
        //   resolve(true);
        // }
      });
    });
  }

  getFotosZip(idMantenimiento: string,AD:string): Observable<any> {
    let url = URL_SERVICIOS + '/mantenimientos/mantenimiento/' + idMantenimiento + '/getfotoszip/'+AD;
    window.open(url);
    return this.http.get(url, { responseType: 'blob' });
  }

}

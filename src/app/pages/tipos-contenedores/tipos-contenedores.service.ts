import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';

@Injectable({
  providedIn: 'root'
})
export class TiposContenedoresService {
  http: any;

  constructor() { }

  getTiposComtenedores(): Observable<any> {
    let url = URL_SERVICIOS + '/tipos_contenedores';
    return this.http.get(url)
  }
}


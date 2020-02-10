import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatSort, MatTableDataSource, MatTabChangeEvent, MatTabGroup } from '@angular/material';
import { ManiobraService } from '../maniobra.service';
import { ESTADOS_CONTENEDOR, ETAPAS_MANIOBRA } from '../../../config/config';
import { Maniobra } from 'src/app/models/maniobra.models';
import { UsuarioService, ExcelService, NavieraService } from 'src/app/services/service.index';
import { ROLES } from 'src/app/config/config';
import { Usuario } from '../../usuarios/usuario.model';
import { Router } from '@angular/router';
import { Naviera } from '../../navieras/navieras.models';
declare var swal: any;

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css'],
})
export class InventarioComponent implements OnInit {

  usuarioLogueado: Usuario;
  cargando = true;
  totalRegistros: number = 0;
  totalRegistrosLR: number = 0;
  displayedColumns = ['fLlegada', 'viaje', 'nombre', 'fVigenciaTemporal', 'pdfTemporal', 'contenedor', 'tipo', 'peso', 'grado'];
  displayedColumnsLR = ['fLlegada', 'viaje', 'nombre', 'contenedor', 'tipo', 'peso', 'grado', 'lavado', 'reparaciones'];
  dataSource: any;
  dataSourceLR: any;
  c40: any;
  c20: any;
  groupedDisponibles20: any;
  groupedDisponibles40: any;
  datosExcel = [];
  totalInventario: number = 0;
  totalReparaciones: number = 0;
  navieras: Naviera[] = [];
  naviera: string = undefined;


  @ViewChild(MatTabGroup) tabGroup: MatTabGroup;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild('MatPaginatorLR', { read: MatPaginator }) MatPaginatorLR: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild("MatSort2") MatSort2: MatSort;
  constructor(public maniobraService: ManiobraService, private usuarioService: UsuarioService,
    private navieraService: NavieraService,
    private _excelService: ExcelService, private router: Router) { }

  ngOnInit() {
    this.usuarioLogueado = this.usuarioService.usuario;
    this.cargarNavieras();
    this.cargarInventario();

    if (this.usuarioLogueado.role == ROLES.ADMIN_ROLE || this.usuarioLogueado.role == ROLES.PATIOADMIN_ROLE) {
      this.displayedColumnsLR = ['actions', 'fLlegada', 'viaje', 'nombre', 'contenedor', 'tipo', 'peso', 'grado', 'lavado', 'reparaciones'];
    } else {
      this.displayedColumnsLR = ['fLlegada', 'viaje', 'nombre', 'contenedor', 'tipo', 'peso', 'grado', 'lavado', 'reparaciones'];
    }
    let indexTAB = localStorage.getItem("InventarioTabs");
    if (indexTAB) {
      this.tabGroup.selectedIndex = Number.parseInt(indexTAB);
    }
  }

  applyFilter(filterValue: string, dataSource: any, totalRegistros: number) {
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
    dataSource.filter = filterValue;
    totalRegistros = dataSource.filteredData.length;
  }

  cargarNavieras() {
    this.cargando = true;
    if (
      this.usuarioLogueado.role === ROLES.NAVIERA_ROLE ||
      this.usuarioLogueado.role === ROLES.CLIENT_ROLE
    ) {
      this.navieras = this.usuarioLogueado.empresas;
    } else {
      this.navieraService.getNavieras().subscribe(navieras => {
        this.navieras = navieras.navieras;
      });
    }
    this.cargando = false;
  }

  cargarInventario() {
    this.cargando = true;
    if ((this.usuarioLogueado.role === ROLES.NAVIERA_ROLE || this.usuarioLogueado.role === ROLES.CLIENT_ROLE)
      && this.usuarioLogueado.empresas.length > 0) {
      this.maniobraService.getManiobras('D', ETAPAS_MANIOBRA.DISPONIBLE, null, null, null, null, null, null, this.usuarioLogueado.empresas[0]._id)
        .subscribe(maniobras => {

          this.c20 = maniobras.maniobras.filter(m => m.tipo.includes('20'));

          const grouped20 = this.c20.reduce((curr, m) => {
            if (!curr[m.tipo]) {
              // Si no has tenido ninguna entrada de ese tipo la agregas pero usando un arreglo
              curr[m.tipo] = [m];
            } else {
              // Si ya tienes ese tipo lo agregas al final del arreglo
              curr[m.tipo].push(m);
            }
            return curr;
          }, {});

          // Luego conviertes ese objeto en un arreglo que *ngFor puede iterar
          this.groupedDisponibles20 = Object.keys(grouped20).map(tipo => {
            return {
              tipo: tipo,
              maniobras: grouped20[tipo]
            };
          });

          this.c40 = maniobras.maniobras.filter(m => m.tipo.includes('40'));

          const grouped40 = this.c40.reduce((curr, m) => {
            if (!curr[m.tipo]) {
              // Si no has tenido ninguna entrada de ese tipo la agregas pero usando un arreglo
              curr[m.tipo] = [m];
            } else {
              // Si ya tienes ese tipo lo agregas al final del arreglo
              curr[m.tipo].push(m);
            }
            return curr;
          }, {});

          // Luego conviertes ese objeto en un arreglo que *ngFor puede iterar
          this.groupedDisponibles40 = Object.keys(grouped40).map(tipo => {
            return {
              tipo: tipo,
              maniobras: grouped40[tipo]
            };
          });

          this.dataSource = new MatTableDataSource(maniobras.maniobras);
          this.dataSource.sort = this.sort;
          this.dataSource.paginator = this.paginator;
          this.totalRegistros = maniobras.maniobras.length;
        });
      this.cargando = false;
    } else {
      if (this.usuarioLogueado.role === ROLES.ADMIN_ROLE || 
        this.usuarioLogueado.role === ROLES.PATIOADMIN_ROLE || 
        this.usuarioLogueado.role === ROLES.PATIO_ROLE) {
        this.maniobraService.getManiobras('D', ETAPAS_MANIOBRA.DISPONIBLE, null, null, null, null, null, null, null, null, null)
          .subscribe(maniobras => {
            this.c20 = maniobras.maniobras.filter(m => m.tipo.includes('20'));

            const grouped20 = this.c20.reduce((curr, m) => {
              if (!curr[m.tipo]) {
                // Si no has tenido ninguna entrada de ese tipo la agregas pero usando un arreglo
                curr[m.tipo] = [m];
              } else {
                // Si ya tienes ese tipo lo agregas al final del arreglo
                curr[m.tipo].push(m);
              }
              return curr;
            }, {});

            // Luego conviertes ese objeto en un arreglo que *ngFor puede iterar
            this.groupedDisponibles20 = Object.keys(grouped20).map(tipo => {
              return {
                tipo: tipo,
                maniobras: grouped20[tipo]
              };
            });

            this.c40 = maniobras.maniobras.filter(m => m.tipo.includes('40'));

            const grouped40 = this.c40.reduce((curr, m) => {
              if (!curr[m.tipo]) {
                // Si no has tenido ninguna entrada de ese tipo la agregas pero usando un arreglo
                curr[m.tipo] = [m];
              } else {
                // Si ya tienes ese tipo lo agregas al final del arreglo
                curr[m.tipo].push(m);
              }
              return curr;
            }, {});

            // Luego conviertes ese objeto en un arreglo que *ngFor puede iterar
            this.groupedDisponibles40 = Object.keys(grouped40).map(tipo => {
              return {
                tipo: tipo,
                maniobras: grouped40[tipo]
              };
            });

            this.dataSource = new MatTableDataSource(maniobras.maniobras);
            this.dataSource.sort = this.sort;
            this.dataSource.paginator = this.paginator;
            this.totalRegistros = maniobras.maniobras.length;
          });
        this.cargando = false;
      }
    }
    this.cargarLR();
  }

  cargarLR() {
    if (this.usuarioLogueado.role === ROLES.NAVIERA_ROLE && this.usuarioLogueado.empresas.length > 0) {
      this.cargando = true;
      this.maniobraService.getManiobrasNaviera(ETAPAS_MANIOBRA.LAVADO_REPARACION, this.usuarioLogueado.empresas[0]._id)
        .subscribe(maniobras => {
          this.dataSourceLR = new MatTableDataSource(maniobras.maniobras);
          this.dataSourceLR.sort = this.MatSort2;
          this.dataSourceLR.paginator = this.MatPaginatorLR;
          this.totalRegistrosLR = maniobras.total;
        });
      this.cargando = false;
    } else {
      if (this.usuarioLogueado.role == ROLES.ADMIN_ROLE || this.usuarioLogueado.role == ROLES.PATIOADMIN_ROLE || this.usuarioLogueado.role == ROLES.PATIO_ROLE) {
        this.cargando = true;
        this.maniobraService.getManiobrasNaviera(ETAPAS_MANIOBRA.LAVADO_REPARACION)
          .subscribe(maniobras => {
            this.dataSourceLR = new MatTableDataSource(maniobras.maniobras);
            this.dataSourceLR.sort = this.MatSort2;
            this.dataSourceLR.paginator = this.MatPaginatorLR;
            this.totalRegistrosLR = maniobras.total;
          });
        this.cargando = false;
      }
    }
  }

  mostrarFotosReparaciones(maniobra: Maniobra) {
    if (this.usuarioLogueado.role === ROLES.ADMIN_ROLE || (this.usuarioLogueado.role === ROLES.NAVIERA_ROLE && maniobra.mostrarFotosRNaviera)) {
      return true;
    } else if (this.usuarioLogueado.role === ROLES.AA_ROLE && maniobra.mostrarFotosRAA) {
      return true;
    } else {
      return false;
    }
  }

  CreaDatosExcel(datos) {
    this.datosExcel = [];
    datos.forEach(d => {
      // console.log(d)
      var dato = {
        EntradaPatio: d.fLlegada,
        Viaje: d.viaje.viaje,
        Buque: d.viaje.buque.nombre,
        VigenciaTemporal: d.viaje.fVigenciaTemporal,
        Contenedor: d.contenedor,
        Tipo: d.tipo,
        Estado: d.peso,
        Grado: d.grado,
        // operador: d.operador != undefined ? d.operador.nombre : '',
        FAlta: d.fAlta.substring(0, 10)
      };
      this.datosExcel.push(dato);
    });
  }

  exportAsXLSX(dataSource, nombre: string): void {
    this.CreaDatosExcel(dataSource.filteredData);
    if (this.datosExcel) {
      this._excelService.exportAsExcelFile(this.datosExcel, nombre);
    } else {
      swal('No se puede exportar un excel vacio', '', 'error');
    }
  }

  cuentaInventario(grado: string, estatus: string, source: any): number {
    let count = 0;
    source.forEach(d => {
      if (d.grado == grado && d.estatus == estatus) {
        count++;
      }
    });
    return count;
  }

  cuentaReparaciones(grado: string, tipo: string, source: any): number {
    let count = 0;
    source.forEach(d => {
      if (d.grado == grado && d.tipo == tipo && d.reparaciones.length > 0) {
        count++;
      }
      // } else if (grado == '' && d.tipo == tipo && d.reparaciones.length > 0) {
      //   count++;
      // }
    });
    return count;
  }

  obtenTotales(tipo: string): number {
    let total = 0;
    if (tipo.includes('20')) {
      if (this.groupedDisponibles20 != undefined) {
        this.groupedDisponibles20.forEach(g20 => {
          total += this.cuentaInventario('A', 'DISPONIBLE', g20.maniobras);
          total += this.cuentaInventario('B', 'DISPONIBLE', g20.maniobras);
          total += this.cuentaInventario('C', 'DISPONIBLE', g20.maniobras);
          total += this.cuentaReparaciones('A', g20.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('B', g20.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('C', g20.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('PT', g20.tipo, this.dataSourceLR.data)
        });
      }
    } else if (tipo.includes('40')) {
      if (this.groupedDisponibles40 != undefined) {
        this.groupedDisponibles40.forEach(g40 => {
          total += this.cuentaInventario('A', 'DISPONIBLE', g40.maniobras);
          total += this.cuentaInventario('B', 'DISPONIBLE', g40.maniobras);
          total += this.cuentaInventario('C', 'DISPONIBLE', g40.maniobras);
          total += this.cuentaReparaciones('A', g40.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('B', g40.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('C', g40.tipo, this.dataSourceLR.data)
          total += this.cuentaReparaciones('PT', g40.tipo, this.dataSourceLR.data)
        });
      }
    }

    return total;
  }

  obtenSubTotales(tipo: string, dataSource, dataSourceLR): number {
    let subTotal = 0;
    if (tipo.includes('20')) {
      if (dataSource != undefined) {
        subTotal += this.cuentaInventario('A', 'DISPONIBLE', dataSource);
        subTotal += this.cuentaInventario('B', 'DISPONIBLE', dataSource);
        subTotal += this.cuentaInventario('C', 'DISPONIBLE', dataSource);

        if (dataSourceLR != undefined) {
          subTotal += this.cuentaReparaciones('A', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('B', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('C', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('PT', tipo, this.dataSourceLR.data)
        }
      } else if (dataSourceLR != undefined) {
        subTotal += this.cuentaReparaciones('A', tipo, dataSourceLR.data)
        subTotal += this.cuentaReparaciones('B', tipo, dataSourceLR.data)
        subTotal += this.cuentaReparaciones('C', tipo, dataSourceLR.data)
        subTotal += this.cuentaReparaciones('PT', tipo, dataSourceLR.data)
      }
    } else if (tipo.includes('40')) {
      if (this.groupedDisponibles40 != undefined) {
        subTotal += this.cuentaInventario('A', 'DISPONIBLE', dataSource);
        subTotal += this.cuentaInventario('B', 'DISPONIBLE', dataSource);
        subTotal += this.cuentaInventario('C', 'DISPONIBLE', dataSource);

        if (dataSourceLR != undefined) {
          subTotal += this.cuentaReparaciones('A', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('B', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('C', tipo, this.dataSourceLR.data)
          subTotal += this.cuentaReparaciones('PT', tipo, this.dataSourceLR.data)
        }
      } else if (dataSourceLR != undefined) {
        subTotal += this.cuentaReparaciones('A', tipo, this.dataSourceLR.data)
        subTotal += this.cuentaReparaciones('B', tipo, this.dataSourceLR.data)
        subTotal += this.cuentaReparaciones('C', tipo, this.dataSourceLR.data)
        subTotal += this.cuentaReparaciones('PT', tipo, this.dataSourceLR.data)
      }
    }
    return subTotal;
  }
  onLinkClick(event: MatTabChangeEvent) {
    localStorage.setItem("InventarioTabs", event.index.toString());
  }

  open(id: string) {
    var history;
    var array = [];
    //Si tengo algo en localStorage en la variable historyArray lo obtengo
    if (localStorage.getItem('historyArray')) {
      //asigno a mi variable history lo que obtengo de localStorage (historyArray)
      history = JSON.parse(localStorage.getItem('historyArray'));

      //realizo este ciclo para asignar los valores del JSON al Array
      for (var i in history) {
        array.push(history[i]);
      }
    }
    //Agrego mi nueva ruta a donde debo regresar al array
    array.push("/inventario");

    //sobreescribo la variable historyArray de localStorage con el nuevo JSON que incluye ya, la nueva ruta.
    localStorage.setItem('historyArray', JSON.stringify(array));

    //Voy a pagina.
    this.router.navigate(['/maniobras/maniobra/' + id + '/termina_lavado_reparacion']);
  }
}

import { ManiobraService } from 'src/app/services/service.index';
import { ImpuestosCFDIComponent } from './../../../dialogs/impuestos-cfdi/impuestos-cfdi.component';
import { FacturacionService } from './../facturacion.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Serie } from '../models/serie.models';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import * as _moment from 'moment';
import { Concepto } from '../models/concepto.models';
import { NavieraService } from '../../navieras/naviera.service';
import { MatDialogConfig, MatDialog } from '@angular/material';
const moment = _moment;

export const MY_FORMATS = {
  parse: {
    dateInput: ['l', 'L'],
  },
  display: {
    dateInput: 'L',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-cfdi',
  templateUrl: './cfdi.component.html',
  styleUrls: ['./cfdi.component.css'],
  providers: [{ provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
  { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
  { provide: MAT_DATE_LOCALE, useValue: 'es-mx' }]
})
export class CFDIComponent implements OnInit, OnDestroy {
  regForm: FormGroup;
  url: string;
  series: Serie[] = [];
  formasPago = [];
  metodosPago = [];
  tiposComprobante = [];
  usosCFDI = [];
  cfdi;
  id;

  constructor(
    public router: Router,
    public activatedRoute: ActivatedRoute,
    private fb: FormBuilder,
    private facturacionService: FacturacionService,
    private navieraService: NavieraService,
    public matDialog: MatDialog,
    public maniobraService: ManiobraService) { }

  ngOnInit() {
    this.createFormGroup();

    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    this.facturacionService.getSeries().subscribe(series => {
      this.series = series.series;
      if (this.facturacionService.IE === 'I') {
        this.serie.setValue(this.series[0].serie);
        this.folio.setValue(this.series[0].folio);
      }
    });

    this.facturacionService.getFormasPago().subscribe(formasPago => {
      this.formasPago = formasPago.formasPago;
      this.formaPago.setValue(formasPago.formasPago[2].formaPago);
    });

    this.facturacionService.getMetodosPago().subscribe(metodosPago => {
      this.metodosPago = metodosPago.metodosPago;
      this.metodoPago.setValue(metodosPago.metodosPago[1].metodoPago);
    });

    this.facturacionService.getTiposComprobante().subscribe(tiposComprobante => {
      this.tiposComprobante = tiposComprobante.tiposComprobante;
      this.tipoComprobante.setValue(this.facturacionService.IE);
    });

    this.facturacionService.getUsosCFDI().subscribe(usosCFDI => {
      this.usosCFDI = usosCFDI.usosCFDI;
    });

    this.conceptos.removeAt(0);

    if (this.id !== 'nuevo') {
      this.cargarCFDI(this.id);
    } else {
      // tslint:disable-next-line: forin
      for (const control in this.regForm.controls) {
        if (control.toString() !== 'conceptos') {
          this.regForm.controls[control.toString()].setValue(undefined);
        }
      }
      this.cargaValoresIniciales(undefined);
    }

    // this.impuestos.removeAt(0);
    this.url = '/cfdis';
  }

  ngOnDestroy(): void {
    this.facturacionService.IE = '';
    this.facturacionService.receptor = undefined;
    this.facturacionService.tipo = '';
    // this.facturacionService.maniobras = [];
  }

  cargaValoresIniciales(concept) {
    this.conceptos.controls = [];
    let conceptoCalcular;
    if (concept !== undefined) {
      conceptoCalcular = concept;
    }

    ////////////////////////////////////////////////////////////////////////////////
    // this.serie.setValue(this.series[0]);
    // this.formaPago.setValue('03');
    this.moneda.setValue('MXN');
    ////////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////// FECHA /////////////////////////////////////
    const timeZone = moment().format('Z');
    const fecha = moment().utcOffset(timeZone).format('YYYY-MM-DDTHH:mm:ss');
    this.fecha.setValue(fecha);
    ///////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////// RECEPTOR /////////////////////////////////////
    if (this.facturacionService.receptor) {
      if (this.facturacionService.tipo === 'Descarga') {
        this.navieraService.getNaviera(this.facturacionService.receptor).subscribe((naviera) => {
          this.rfc.setValue(naviera.rfc);
          this.nombre.setValue(naviera.razonSocial);
          this.usoCFDI.setValue(naviera.usoCFDI.usoCFDI);
          let direccion = '';
          direccion += naviera.calle !== undefined && naviera.calle !== '' ? naviera.calle : '';
          direccion += naviera.noExterior !== undefined && naviera.noExterior !== '' ? ' ' + naviera.noExterior : '';
          direccion += naviera.colonia !== undefined && naviera.colonia !== '' ? ' ' + naviera.colonia : '';
          direccion += naviera.municipio !== undefined && naviera.municipio !== '' ? ' ' + naviera.municipio : '';
          direccion += naviera.ciudad !== undefined && naviera.ciudad !== '' ? ' ' + naviera.ciudad : '';
          direccion += naviera.estado !== undefined && naviera.estado !== '' ? ' ' + naviera.estado : '';
          direccion += naviera.cp !== undefined && naviera.cp !== '' ? ' ' + naviera.cp : '';
          this.direccion.setValue(direccion.trim());
          this.correo.setValue(naviera.correoFac);
        });
      }
    }
    /////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////// CONCEPTO /////////////////////////////////////////////
    let totalImpuestosRetenidos = 0;
    let totalImpuestosTrasladados = 0;
    let subTotal = 0;

    if (this.facturacionService.aFacturar.length > 0) {
      if (this.facturacionService.tipo === 'Descarga') {

        this.facturacionService.aFacturar.forEach(c => {
          let impuestosRetenidos = 0;
          let impuestosTrasladados = 0;
          const concepto = new Concepto();
          this.facturacionService.getProductoServicio(c.idProdServ).subscribe((prodServ) => {
            concepto._id = prodServ._id;
            concepto.cantidad = c.maniobras.length;
            if (prodServ) {
              concepto.claveProdServ = prodServ.claveSAT.claveProdServ;
              concepto.claveUnidad = prodServ.unidadSAT.claveUnidad;
              concepto.descripcion = prodServ.descripcion;
              concepto.noIdentificacion = prodServ.codigo;
              concepto.valorUnitario = prodServ !== undefined ? prodServ.valorUnitario : 0;
              concepto.importe = concepto.valorUnitario * c.maniobras.length;
              subTotal += concepto.importe;
              if (conceptoCalcular && prodServ._id === conceptoCalcular._id) {
                conceptoCalcular.impuestos.forEach(impuesto => {
                  if (impuesto.TR === 'RETENCION') {
                    impuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                    totalImpuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                  } else {
                    if (impuesto.TR === 'TRASLADO') {
                      impuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                      totalImpuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                    }
                  }
                });
                concepto.impuestos = conceptoCalcular.impuestos;
              } else {
                prodServ.impuestos.forEach(impuesto => {
                  impuesto.importe = concepto.importe * (impuesto.tasaCuota / 100);
                  if (impuesto.TR === 'RETENCION') {
                    impuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                    totalImpuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                  } else {
                    if (impuesto.TR === 'TRASLADO') {
                      impuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                      totalImpuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                    }
                  }
                });
                concepto.impuestos = prodServ.impuestos;
              }
              concepto.impuestosRetenidos = impuestosRetenidos;
              concepto.impuestosTrasladados = impuestosTrasladados;
              // concepto.impuestos = prodServ.impuestos;
            }

            concepto.unidad = '0';
            concepto.descuento = 0.00;
            concepto.maniobras = c.maniobras;

            this.subtotal.setValue(subTotal);
            this.totalImpuestosRetenidos.setValue(totalImpuestosRetenidos);
            this.totalImpuestosTrasladados.setValue(totalImpuestosTrasladados);
            this.total.setValue(subTotal + totalImpuestosTrasladados - totalImpuestosRetenidos);

            this.conceptos.push(this.agregarArray(concepto));
          });
        });
      }
      // this.maniobras.setValue(this.facturacionService.maniobras);
    } else {
      this.subtotal.setValue(subTotal);
      this.totalImpuestosRetenidos.setValue(totalImpuestosRetenidos);
      this.totalImpuestosTrasladados.setValue(totalImpuestosTrasladados);
      this.total.setValue(subTotal + totalImpuestosTrasladados - totalImpuestosRetenidos);
    }
    /////////////////////////////////////////////////////////////////////////////////////////
  }

  recargaValoresIniciales(cfdi) {
    // this.conceptos.controls = [];
    // let conceptoCalcular;
    // if (cfdi !== undefined) {
    //   conceptoCalcular = cfdi;
    // }

    ////////////////////////////////////////////////////////////////////////////////
    // this.serie.setValue(this.series[0]);
    // this.formaPago.setValue('03');
    this.moneda.setValue('MXN');
    ////////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////// FECHA /////////////////////////////////////
    const timeZone = moment().format('Z');
    const fecha = moment().utcOffset(timeZone).format('YYYY-MM-DDTHH:mm:ss');
    this.fecha.setValue(fecha);
    ///////////////////////////////////////////////////////////////////////////////

    /////////////////////////////////// RECEPTOR /////////////////////////////////////
    if (this.cfdi.receptor) {
        this.direccion.setValue(this.cfdi.direccion.trim());
        this.correo.setValue(this.cfdi.correo);
    }
    /////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////// CONCEPTO /////////////////////////////////////////////
    let totalImpuestosRetenidos = 0;
    let totalImpuestosTrasladados = 0;
    let subTotal = 0;

    if (this.cfdi.conceptos.length > 0) {
      // if (this.facturacionService.tipo === 'Descarga') {

        this.cfdi.conceptos.forEach(c => {
          let impuestosRetenidos = 0;
          let impuestosTrasladados = 0;
          const concepto = new Concepto();
          // this.facturacionService.getProductoServicio(c.idProdServ).subscribe((prodServ) => {
            concepto._id = c._id;
            concepto.cantidad = c.maniobras.length;
            // if (c) {
              concepto.claveProdServ = c.claveProdServ;
              concepto.claveUnidad = c.claveUnidad;
              concepto.descripcion = c.descripcion;
              concepto.noIdentificacion = c.noIdentificacion;
              concepto.valorUnitario = c.valorUnitario;
              concepto.importe = concepto.valorUnitario * c.maniobras.length;
              subTotal += concepto.importe;
              // if (conceptoCalcular && c._id === conceptoCalcular._id) {
              //   conceptoCalcular.impuestos.forEach(impuesto => {
              //     if (impuesto.TR === 'RETENCION') {
              //       impuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
              //       totalImpuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
              //     } else {
              //       if (impuesto.TR === 'TRASLADO') {
              //         impuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
              //         totalImpuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
              //       }
              //     }
              //   });
              //   concepto.impuestos = conceptoCalcular.impuestos;
              // } else {
                c.impuestos.forEach(impuesto => {
                  impuesto.importe = concepto.importe * (impuesto.tasaCuota / 100);
                  if (impuesto.TR === 'RETENCION') {
                    impuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                    totalImpuestosRetenidos += concepto.importe * (impuesto.tasaCuota / 100);
                  } else {
                    if (impuesto.TR === 'TRASLADO') {
                      impuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                      totalImpuestosTrasladados += concepto.importe * (impuesto.tasaCuota / 100);
                    }
                  }
                });
                concepto.impuestos = c.impuestos;
              // }
              concepto.impuestosRetenidos = impuestosRetenidos;
              concepto.impuestosTrasladados = impuestosTrasladados;
              // concepto.impuestos = c.impuestos;
            // }

            concepto.unidad = '0';
            concepto.descuento = 0.00;
            concepto.maniobras = c.maniobras;

            this.subtotal.setValue(subTotal);
            this.totalImpuestosRetenidos.setValue(totalImpuestosRetenidos);
            this.totalImpuestosTrasladados.setValue(totalImpuestosTrasladados);
            this.total.setValue(subTotal + totalImpuestosTrasladados - totalImpuestosRetenidos);

            this.conceptos.push(this.agregarArray(concepto));
          // });
        });
      // }
      // this.maniobras.setValue(this.facturacionService.maniobras);
    } else {
      this.subtotal.setValue(subTotal);
      this.totalImpuestosRetenidos.setValue(totalImpuestosRetenidos);
      this.totalImpuestosTrasladados.setValue(totalImpuestosTrasladados);
      this.total.setValue(subTotal + totalImpuestosTrasladados - totalImpuestosRetenidos);
    }
    /////////////////////////////////////////////////////////////////////////////////////////
  }

  createFormGroup() {
    this.regForm = this.fb.group({
      // GENERALES
      fecha: ['', [Validators.required]],
      // fecha: [moment().local().startOf('day')],
      // folio: ['', [Validators.required]],
      folio: [{ value: '', disabled: true }, [Validators.required]],
      formaPago: ['', [Validators.required]],
      metodoPago: ['', [Validators.required]],
      moneda: ['', [Validators.required]],
      serie: ['', [Validators.required]],
      subtotal: [{ value: '', disabled: true }, [Validators.required]],
      tipoComprobante: [{ value: '', disabled: true }, [Validators.required]],
      // tipoComprobante: [{ value: '', disabled: true }, [Validators.required]],
      total: [{ value: '', disabled: true }, [Validators.required]],
      // RECEPTOR
      nombre: ['', [Validators.required]],
      rfc: ['', [Validators.required]],
      usoCFDI: ['', [Validators.required]],
      direccion: ['', [Validators.required]],
      correo: ['', [Validators.required]],
      // CONCEPTOS
      cantidad: [''],
      claveProdServ: [''],
      claveUnidad: [''],
      descripcion: [''],
      noIdentificacion: [''],
      valorUnitario: [''],
      importe: [''],
      impuestos: [''],
      unidad: [''],
      descuento: [''],
      // maniobras: [''],
      impuestosRetenidos: [''],
      impuestosTrasladados: [''],
      conceptos: this.fb.array([this.agregarArray(new Concepto)], { validators: Validators.required }),
      // CFDIS RELACIONADOS
      // cfdiRelacionados: ['', [Validators.required]],
      // IMPUESTOS
      totalImpuestosRetenidos: [{ value: '', disabled: true }, [Validators.required]],
      totalImpuestosTrasladados: [{ value: '', disabled: true }, [Validators.required]],
      sucursal: [{ value: '', disabled: true }],
      _id: ['']
    });
  }

  agregarArray(concepto: Concepto): FormGroup {
    return this.fb.group({
      // consecutivo: [concepto.consecutivo],
      _id: [concepto._id],
      cantidad: [concepto.cantidad],
      claveProdServ: [concepto.claveProdServ],
      claveUnidad: [concepto.claveUnidad],
      descripcion: [concepto.descripcion],
      noIdentificacion: [concepto.noIdentificacion],
      importe: [concepto.importe],
      valorUnitario: [concepto.valorUnitario],
      impuestos: [concepto.impuestos],
      unidad: [concepto.unidad],
      descuento: [concepto.descuento],
      maniobras: [concepto.maniobras],
      impuestosRetenidos: [concepto.impuestosRetenidos],
      impuestosTrasladados: [concepto.impuestosTrasladados]
    });
  }

  quitar(indice: number) {
    const id = this.conceptos.value[indice]._id;
    const pos = this.facturacionService.aFacturar.findIndex(a => a.idProdServ === id);
    this.facturacionService.aFacturar.splice(pos, 1);
    if (this.id === 'nuevo' || this.id === undefined) {
      this.cargaValoresIniciales(undefined);
    } else {

    }
    this.conceptos.removeAt(indice);
    // console.log(this.conceptos);
  }

  cargarCFDI(id: string) {
    this.facturacionService.getCFDI(id).subscribe(res => {
      this.cfdi = res;

      // tslint:disable-next-line: forin
      for (const propiedad in this.cfdi) {
        for (const control in this.regForm.controls) {
          if (propiedad === control.toString() && propiedad !== 'conceptos') {
            this.regForm.controls[propiedad].setValue(res[propiedad]);
          }
        }
      }

      if (res.conceptos.length > 0) {
        let subTotal = 0;
        if (res.conceptos[0].maniobras.length > 0) {
          this.maniobraService.getManiobra(res.conceptos[0].maniobras[0]).subscribe(m => {
            this.facturacionService.receptor = m.maniobra.naviera._id;
          });
        }
        res.conceptos.forEach(concepto => {
          let impuestosRetenidos = 0;
          let impuestosTrasladados = 0;
          subTotal += concepto.importe;
          concepto.impuestos.forEach(impuesto => {
            if (impuesto.TR === 'RETENCION') {
              impuestosRetenidos += impuesto.importe;
            } else {
              if (impuesto.TR === 'TRASLADO') {
                impuestosTrasladados += impuesto.importe;
              }
            }
          });
          this.conceptos.push(this.agregarArray(new Concepto(
            concepto.cantidad,
            concepto.claveProdServ,
            concepto.claveUnidad,
            concepto.descripcion,
            concepto.noIdentificacion,
            concepto.valorUnitario,
            concepto.importe,
            concepto.impuestos,
            concepto.unidad,
            concepto.descuento,
            concepto.maniobras,
            impuestosRetenidos,
            impuestosTrasladados,
            concepto._id)));
        });
      } else {
        this.regForm.controls['conceptos'].setValue(undefined);
      }
    });
  }

  guardarCFDI() {
    if (this.regForm.valid) {
      this.facturacionService.guardarCFDI(this.regForm.getRawValue()).subscribe(res => {
        if (this.regForm.get('_id').value === '' ||
          this.regForm.get('_id').value === undefined) {
          this.regForm.get('_id').setValue(res._id);
          this.router.navigate(['/cfdi/', this.regForm.get('_id').value]);
        }
        this.facturacionService.aFacturar = [];
        this.regForm.markAsPristine();
      });
    }
  }

  cambioSerie(serie) {
    this.facturacionService.getSerieXSerie(serie).subscribe(s => {
      this.serie.setValue(s.serie);
      this.folio.setValue(s.folio);
    });
  }

  openDialogImpuestos(concepto) {
    let cfdi;
    cfdi = this.cfdi;
    // console.log(concepto[0].impuestos);
    const dialogConfig = new MatDialogConfig();
    dialogConfig.data = concepto;
    const dialogRef = this.matDialog.open(ImpuestosCFDIComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cfdi = cfdi;
        if (this.id === 'nuevo' || this.id === undefined) {
          this.cargaValoresIniciales(dialogConfig.data);
        } else {
          this.cargarCFDI(this.id);
          const pos = cfdi.conceptos.findIndex(a => a._id === result._id);
        if (pos >= 0) {
          this.cfdi.conceptos[pos] = result;
        }
          this.recargaValoresIniciales(cfdi);
        }
        // this.conceptos.value.forEach(c => {
        //   if (c._id === concepto._id) {
        //     c = result;
        //   }
        // });

        // this.maniobraService.getManiobra(result.maniobras[0]).subscribe(maniob => {
        //   this.facturacionService.receptor = maniob.maniobra.naviera._id;
        //   this.facturacionService.tipo = 'Descarga';
        //   this.cargaValoresIniciales(concepto);
        // });
      }
    });
  }

  back() {
    if (localStorage.getItem('history')) {
      this.url = localStorage.getItem('history');
    }
    this.router.navigate([this.url]);
    localStorage.removeItem('history');
  }

  /* #region  Properties */
  get serie() {
    return this.regForm.get('serie');
  }

  get folio() {
    return this.regForm.get('folio');
  }

  get sucursal() {
    return this.regForm.get('sucursal');
  }

  get formaPago() {
    return this.regForm.get('formaPago');
  }

  get metodoPago() {
    return this.regForm.get('metodoPago');
  }

  get moneda() {
    return this.regForm.get('moneda');
  }

  get tipoComprobante() {
    return this.regForm.get('tipoComprobante');
  }

  get fecha() {
    return this.regForm.get('fecha');
  }

  get receptor() {
    return this.regForm.get('receptor');
  }

  get rfc() {
    return this.regForm.get('rfc');
  }

  get nombre() {
    return this.regForm.get('nombre');
  }

  get usoCFDI() {
    return this.regForm.get('usoCFDI');
  }

  get direccion() {
    return this.regForm.get('direccion');
  }

  get correo() {
    return this.regForm.get('correo');
  }

  get cantidad() {
    return this.regForm.get('cantidad');
  }

  get claveProdServ() {
    return this.regForm.get('claveProdServ');
  }

  get claveUnidad() {
    return this.regForm.get('claveUnidad');
  }

  get descripcion() {
    return this.regForm.get('descripcion');
  }

  get noIdentificacion() {
    return this.regForm.get('noIdentificacion');
  }

  get valorUnitario() {
    return this.regForm.get('valorUnitario');
  }

  get importe() {
    return this.regForm.get('importe');
  }

  get impuestos() {
    return this.regForm.get('impuestos');
  }

  get unidad() {
    return this.regForm.get('unidad');
  }

  get descuento() {
    return this.regForm.get('descuento');
  }

  // get maniobras() {
  //   return this.regForm.get('maniobras');
  // }

  get impuestosRetenidos() {
    return this.regForm.get('impuestosRetenidos');
  }

  get impuestosTrasladados() {
    return this.regForm.get('impuestosTrasladados');
  }

  get conceptos() {
    return this.regForm.get('conceptos') as FormArray;
  }

  get subtotal() {
    return this.regForm.get('subtotal');
  }

  get totalImpuestosRetenidos() {
    return this.regForm.get('totalImpuestosRetenidos');
  }

  get totalImpuestosTrasladados() {
    return this.regForm.get('totalImpuestosTrasladados');
  }

  get total() {
    return this.regForm.get('total');
  }
  /* #endregion */
}
import { FormControl, FormGroup } from '@angular/forms';
import { Component, AfterViewInit, ElementRef, ViewChild,ViewChildren,QueryList} from '@angular/core';
import { Web3Service } from './services/web3.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('scrollframe',{static:false}) private scrollFrame!: ElementRef;
  @ViewChildren('item') itemElements!: QueryList<any>;

  private scrollContainer: any;

  title = 'Ejemplo Ethereum';
  msgEstado = 'No Conectado.';
  estado = false;
  count = 0;
  resultado = '';
  resultadoUse = '';
  points = 0;
  totalRewardPoints = 0;

  blockHash = '';
  blockNumber = '';
  from = '';
  transactionHash = '';
  totalBalance = '';
  amount = '';
  rewardPoints = '';
  exchangedRewardPoints = '';

  elementos: any = [];  
  elementosClient: any = [];  

  resultadoTickets = '';
  cabeceras = ['Transaction Hash', 'Block Number','Amount','Sended Reward Points','Total Reward Points','To'];
  constructor(public web3s: Web3Service){}

  buyTicketsForm = new FormGroup({
    accountAddress: new FormControl(''),
    buyAmount: new FormControl('')
  });

  useTicketsForm = new FormGroup({
    accountAddress: new FormControl(''),
    useAmount: new FormControl('')
  });

  ticketHoldersForm = new FormGroup({
    accountAddress: new FormControl(''),
  });

  ngAfterViewInit(): void {
    this.conectar();
    this.scrollContainer = this.scrollFrame.nativeElement;      
    //this.elementos.changes.subscribe(() => this.onElementosChanged());   
  }

  private onElementosChanged(): void {
    this.scrollToBottom();
  }

  conectar():void {
    this.web3s.connectAccount().then((r)=>{ 
      this.msgEstado = "Conectado.";
      this.estado = true;
      this.subscribeToEvents();
    });
  }

  getTotalRewardPoints(): void {
    this.web3s.contrato.methods.getTotalRewardPoints()
    .call()
    .then((response: any) => {
      this.totalRewardPoints = response;
      console.log(`totalRewardPoints => ${response}`);
    });
  }

  getRewardPoints(): void {
    this.web3s.contrato.methods.getRewardPoints()
    .call()
    .then((response: any) => {
      this.getRewardPoints = response;
      console.log(`getRewardPoints => ${response}`);
    });
  }

  //obtiene el balance de la billetera que ejecuta la simulacion de intercambio de puntos
  getBalance(): void {
    this.web3s.contrato.methods.balanceOf(this.web3s.accounts[0])
    .call()
    .then((response: any) => {
      this.totalBalance = response;
    });
  }

  async getBalanceByAccount(accountAddress: any): Promise<any> {
    return await this.web3s.contrato.methods.balanceOf(accountAddress).call();
  }

  async buyTickets(): Promise<void> {
    this.borrar();

    console.log(`accountAddress => ${this.buyTicketsForm.get('accountAddress')?.value}`);
    console.log(`buyAmount => ${this.buyTicketsForm.get('buyAmount')?.value}`);
    const accountAddress = this.buyTicketsForm.get('accountAddress')?.value;
    const buyAmount = this.buyTicketsForm.get('buyAmount')?.value;
    
    
    this.web3s.contrato.methods.transfer(accountAddress, buyAmount ).send({from: this.web3s.accounts[0]})
    .then((response:any) => {
      this.resultado = "Transacción realizada!";
      
      this.blockHash = response.blockHash;
      this.blockNumber = response.blockNumber;
      this.from = response.from;
      this.transactionHash = response.transactionHash;
      this.web3s.contrato.methods.approve(accountAddress, buyAmount ).send({from: this.web3s.accounts[0]})
   })
   .catch((error: any) => {
      console.log(error);
      this.resultado = "Error en la transacción!";
   });
  }

  async useTickets(): Promise<void> {
    this.borrar();

    console.log(`useAmount => ${this.useTicketsForm.get('useAmount')?.value}`);
    const ownerAddress = '0x37f9ee76f4bB02e5f234c90d4220Ee6c2477794A';
    const useAmount = this.useTicketsForm.get('useAmount')?.value;

    const accountBalance = await this.getBalanceByAccount(this.web3s.accounts[0]);

    console.log(`accountBalance => ${accountBalance}`);

    this.web3s.contrato.methods.transfer(ownerAddress, useAmount ).send({from: this.web3s.accounts[0]})
    .then((response:any) => {
      this.resultadoUse = "Transacción realizada!";
      this.blockHash = response.blockHash;
      this.blockNumber = response.blockNumber;
      this.from = response.from;
      this.transactionHash = response.transactionHash;
      this.getBalance();
   })
   .catch((error: any) => {
      console.log(error);
      this.resultadoUse = "Error en la transacción!";
   });
  }

  async ticketHolders(): Promise<void> {
    
    const accountAddress = this.ticketHoldersForm.get('accountAddress')?.value;
    this.resultadoTickets=await this.getBalanceByAccount(accountAddress);
    

  }

  borrar(): void {
    this.resultado = "";
    this.blockHash = "";
    this.blockNumber = "";
    this.from = "";
    this.transactionHash = "";
  }
  
  subscribeToEvents() {
    // Subscribe to pending transactions
    const self = this;
    this.web3s.contrato.events.Transfer({
                                              fromBlock: 0
                                            },
                                            (error: any, event: any) => {
                                              if (!error){
                                                // setInterval(() => {

                                                  const abiDecoder = require('abi-decoder'); // NodeJS
                                                  abiDecoder.addABI(this.web3s.abi);
                                                  
                                                  this.web3s.web3js.eth.getTransaction(event.transactionHash).then(async (data: any) => {

                                                    const decodedData = abiDecoder.decodeMethod(data.input);

                                                    if(decodedData != undefined) {

                                                      //recuperando datos registrados al enviar puntos
                                                      //datos recuperados: amount, rewardPoints
                                                      if(decodedData.name == 'transfer') {
                                                        this.amount = decodedData.params[1].value
                                                        this.rewardPoints = decodedData.params[2].value;
                                                        this.exchangedRewardPoints = '0';
                                                        this.totalRewardPoints = decodedData.params[3].value;

                                                        this.elementos.push(
                                                          { blockHash: event.blockHash,
                                                            transactionHash: event.transactionHash,
                                                            blockNumber:event.blockNumber,                                            
                                                            amount: this.amount,
                                                            rewardPoints: this.rewardPoints,
                                                            totalRewardPoints: this.totalRewardPoints,
                                                            accountAddress: event.returnValues.to,
                                                            
                                                          }
                                                        );
                                                          
                                                      
                                                        this.elementos = this.elementos.sort((a: any, b: any) => parseInt(a.blockNumber) - parseInt(b.blockNumber));

                                                      //recuperando data de los puntos intercambiados
                                                      //datos recuperados: exchangedRewardPoints
                                                      }else if(decodedData.name == 'exchangePoints') {
                                                        this.exchangedRewardPoints = decodedData.params[1].value;
                                                        this.totalRewardPoints = decodedData.params[2].value;

                                                        this.elementosClient.push(
                                                          { blockHash: event.blockHash,
                                                            transactionHash: event.transactionHash,
                                                            blockNumber:event.blockNumber,                                            
                                                            exchangedRewardPoints: this.exchangedRewardPoints,
                                                            totalRewardPoints: this.totalRewardPoints,
                                                            accountAddress: event.returnValues.from
                                                          }
                                                        );
  
                                                        this.elementosClient = this.elementosClient.sort((a: any, b: any) => parseInt(a.blockNumber) - parseInt(b.blockNumber));

                                                      }else {

                                                      }
                                                      
                                                    }

                                                  });
                                                  
                                                // }, 500);                                                                                                
                                              }                                              
                                            });
  }

  scrollToBottom() {
    this.scrollContainer.scroll({
      top: this.scrollContainer.scrollHeight,
      left: 0,
      behavior: 'smooth'
    });
  }
}
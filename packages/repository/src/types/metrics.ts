export module Mass {
  export type Unit = "mg";
  export type Measure = {
    amount: number;
    unit: Unit;
  }
}


export module Volume {
  export type Unit = "ml" | "oz";
  export type Measure = {
    amount: number;
    unit: Unit;
  }
}

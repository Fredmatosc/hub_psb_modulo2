// Tipos compartilhados para o módulo PSB

export interface ElectedPolitician {
  sequencial: string;
  name: string;
  nameUrna: string;
  cargo: string;
  uf: string;
  stateName?: string;
  ano: number;
  municipality: string;
  votes: number;
  percentage: number;
  situation: string;
  receipt: number;
  expense: number;
  costPerVote: number;
  photoUrl: string;
}

export interface ElectedListResult {
  items: ElectedPolitician[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NationalSummary {
  mayors: number;
  councilors: number;
  federalDeputies: number;
  stateDeputies: number;
  senators: number;
  governors: number;
}

export interface StateRankingItem {
  uf: string;
  name: string;
  mayors: number;
  councilors: number;
  federalDeputies: number;
  stateDeputies: number;
  senators: number;
  governors: number;
  total: number;
}

export interface StateDemographics {
  uf: string;
  name: string;
  population: number;
  voters: number;
  turnout: number;
  abstention: number;
  ibgeCode: string;
}

export interface StateDirectory {
  uf: string;
  name: string;
  president: string;
  address: string;
  phone: string;
  email: string;
  facebook?: string;
  instagram?: string;
  website?: string;
  presidentSequencial: string | null;
  presidentPhotoUrl: string | null;
}

export interface StateQuadro {
  uf: string;
  name: string;
  mayors: number;
  councilors: number;
  federalDeputies: number;
  stateDeputies: number;
  senators: number;
  governors: number;
}

export interface StateHistoryItem {
  year: number;
  mayors: number;
  councilors: number;
  federalDeputies: number;
  stateDeputies: number;
  senators: number;
  governors: number;
  total: number;
}

export interface MunicipalityItem {
  name: string;
  code: string;
  mayors: number;
  councilors: number;
  total: number;
}

export interface PoliticianProfile {
  sequencial: string;
  name: string;
  nameUrna: string;
  party: string;
  uf: string;
  stateName: string;
  cargo: string;
  ano: number;
  municipality: string;
  votes: number;
  percentage: number;
  situation: string;
  elected: boolean;
  receipt: number;
  expense: number;
  costPerVote: number;
  cpf: string;
  photoUrl: string;
}

export interface PoliticianHistoryItem {
  year: number;
  cargo: string;
  uf: string;
  municipality: string;
  party: string;
  votes: number;
  percentage: number;
  situation: string;
  elected: boolean;
  receipt: number;
  expense: number;
  costPerVote: number;
  sequencial: string;
  photoUrl: string;
}

export interface ZoneVote {
  municipalityCode: string;
  municipality: string;
  zone: string;
  votes: number;
}

export interface Competitor {
  rank: number;
  sequencial: string;
  name: string;
  party: string;
  votes: number;
  percentage: number;
  situation: string;
  elected: boolean;
  isTarget: boolean;
  photoUrl: string;
}

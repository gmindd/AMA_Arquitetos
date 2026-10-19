// Dados legais da empresa, usados no rodapé, na página de informação
// legal e na política de privacidade. Os campos vazios aparecem no site
// assinalados como "a preencher": completar com os dados oficiais
// (certidão permanente, Ordem dos Arquitectos e IMPIC) antes de publicar.

export const empresa = {
  /** Firma tal como consta da certidão permanente, ex.: "AMA – André Melissa Arquitetos, Lda." */
  firma: '',
  /** Número de identificação de pessoa coletiva (NIPC) */
  nipc: '',
  /** Conservatória do Registo Comercial onde está matriculada */
  conservatoria: '',
  /** Capital social, ex.: "5 000 €" (obrigatório nos sites de sociedades por quotas) */
  capitalSocial: '',
  sede: 'Avenida do Atlântico 221, loja 10, 4935-580 Chafé, Viana do Castelo',
  email: 'arquitetos@ama-lda.com',
  telefones: [
    { nome: 'André Machado', numero: '917 091 338', href: 'tel:+351917091338' },
    { nome: 'Melissa Fazendeiro', numero: '918 133 120', href: 'tel:+351918133120' },
  ],
  instagram: { rotulo: '@andremelissaarquitetos', href: 'https://www.instagram.com/andremelissaarquitetos' },
  /** Arquitetos responsáveis e respetivo número de inscrição na Ordem dos Arquitectos */
  arquitetos: [
    { nome: 'André Machado', ordem: '' },
    { nome: 'Melissa Fazendeiro', ordem: '' },
  ],
  /** Alvará ou certificado de empreiteiro emitido pelo IMPIC (execução de obras) */
  alvara: '',
};

// Livro de Reclamações Eletrónico (Decreto-Lei n.º 74/2017)
export const LIVRO_RECLAMACOES = 'https://www.livroreclamacoes.pt/Inicio/';

// Resolução alternativa de litígios de consumo (Lei n.º 144/2015)
export const ral = [
  {
    nome: 'CIAB – Centro de Informação, Mediação e Arbitragem de Consumo (Tribunal Arbitral de Consumo)',
    nota: 'Competente para conflitos de consumo nos distritos de Braga e Viana do Castelo.',
    href: 'https://www.ciab.pt',
  },
  {
    nome: 'CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo',
    nota: 'Competência supletiva a nível nacional.',
    href: 'https://www.cniacc.pt',
  },
];

export const PORTAL_CONSUMIDOR = 'https://www.consumidor.gov.pt';

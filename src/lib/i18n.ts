// i18n do site AMA — dicionário PT / EN / FR e utilitários.
// PT é a fonte-fonte; EN e FR devem ser revistas pela equipa antes de
// publicar (a fase de tradução foi feita pelo assistente).

export type Locale = 'pt' | 'en' | 'fr';

export const LOCALES: Locale[] = ['pt', 'en', 'fr'];
export const LOCALE_DEFAULT: Locale = 'pt';

// Rótulos dos idiomas para o seletor de bandeiras
export const NOME_LOCALE: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
};

// Copy fixo do site. Adicionar uma chave nova: preenche as 3 línguas.
type Dicionario = Record<Locale, Record<string, string>>;

export const dicionario: Dicionario = {
  pt: {
    'nav.projetos': 'Projetos',
    'nav.reabilitacao': 'Reabilitação',
    'nav.sobre': 'Sobre',
    'nav.contactos': 'Contactos',
    'nav.enviarMensagem': 'Enviar mensagem',
    'nav.abrirMenu': 'Abrir menu',
    'nav.fecharMenu': 'Fechar menu',
    'nav.saltarConteudo': 'Saltar para o conteúdo',
    'nav.paginaInicial': 'AMA, página inicial',
    'nav.trocarLingua': 'Trocar de língua',

    'site.tituloBase': 'AMA André Melissa Arquitetos · Gabinete de arquitetura, Viana do Castelo',
    'site.descricaoBase':
      'Gabinete de arquitetura em Viana do Castelo. Habitação, interiores e reconversão de espaços. Reabilitações e tratamento de fachadas com equipa própria.',

    'sobre.titulo': 'Sobre',
    'sobre.tituloPagina': 'Sobre · AMA André Melissa Arquitetos',
    'sobre.paragrafo1':
      'O AMA é um gabinete de arquitetura fundado em 2022 por André Machado e Melissa Fazendeiro, em Viana do Castelo. Desenvolvemos projetos de habitação, reabilitação, interiores e reconversão de espaços. Nas obras de reabilitação, do tratamento de fachadas de prédios a intervenções em condomínios, executamos com equipa de construção própria.',
    'sobre.assinatura':
      'Um bom projeto nasce do encontro entre o lugar, o projeto e o cliente.',
    'sobre.paragrafo2': 'O resto é rigor, transparência e qualidade sem cedências.',
    'sobre.fotoAlt': 'André Machado e Melissa Fazendeiro, fundadores do AMA',
    'sobre.fotoLegenda': 'André Machado · Melissa Fazendeiro',

    'reabilitacao.titulo': 'Reabilitação',
    'reabilitacao.tituloPagina': 'Reabilitação · AMA André Melissa Arquitetos',
    'reabilitacao.descricao':
      'Fachadas, condomínios e reabilitações executadas pela equipa de construção própria do gabinete. Registo antes e depois.',
    'reabilitacao.intro':
      'Fachadas, condomínios e reabilitações executadas pela equipa de construção própria do gabinete. Quem desenha é quem executa.',
    'reabilitacao.antes': 'Antes',
    'reabilitacao.depois': 'Depois',

    'contactos.titulo': 'Contactos',
    'contactos.tituloPagina': 'Contactos · AMA André Melissa Arquitetos',
    'contactos.morada': 'Morada',
    'contactos.telefone': 'Telefone',
    'contactos.email': 'E-mail',
    'contactos.instagram': 'Instagram',
    'contactos.form.nome': 'Nome',
    'contactos.form.contacto': 'Contacto',
    'contactos.form.tipo': 'Tipo',
    'contactos.form.tipo.arquitetura': 'Projeto de arquitetura',
    'contactos.form.tipo.reabilitacao': 'Reabilitação',
    'contactos.form.tipo.ambos': 'Ambos',
    'contactos.form.localizacao': 'Localização',
    'contactos.form.mensagem': 'Mensagem',
    'contactos.form.enviar': 'Enviar mensagem',
    'contactos.form.prazo': 'Respondemos em 24 a 48h úteis.',
    'contactos.form.honeypot': 'Não preencher',
    'contactos.form.sucesso': 'Pedido recebido. Respondemos em 24 a 48h úteis.',
    'contactos.form.novo': 'Enviar outra mensagem',
    'contactos.erro.nome': 'Indique o nome.',
    'contactos.erro.contacto': 'Indique um contacto.',
    'contactos.erro.localizacao': 'Indique a localização.',
    'contactos.erro.mensagem': 'Escreva uma mensagem.',
    'contactos.erro.envio':
      'Não foi possível enviar agora. Contacte-nos por email ou telefone.',

    'projeto.tipologia': 'Tipologia',
    'projeto.local': 'Local',
    'projeto.area': 'Área',
    'projeto.ano': 'Ano',
    'projeto.anterior': 'Anterior',
    'projeto.seguinte': 'Seguinte',
    'projeto.outrosProjetos': 'Outros projetos',
    'projeto.imagemN': 'imagem',

    'rodape.morada': 'Morada',
    'rodape.contactos': 'Contactos',
    'rodape.navegacao': 'Navegação',
    'rodape.ama': 'AMA',
    'rodape.bio':
      'Gabinete de arquitetura em Viana do Castelo. Habitação, interiores e reconversão de espaços. Reabilitações e tratamento de fachadas com equipa própria. Um só interlocutor, do projeto à obra.',
    'rodape.copyright': '© {ano} AMA André Melissa Arquitetos',
    'rodape.coords': '41.6448° N, 8.8236° O · Praia da Amorosa',
    'rodape.crafted': 'crafted by pereiragabriel',

    '404.titulo': 'Página não encontrada',
    '404.descricao':
      'A página que procura não existe ou foi movida. Explore os projetos ou volte à home.',
    '404.voltar': 'Voltar à home',
  },
  en: {
    'nav.projetos': 'Projects',
    'nav.reabilitacao': 'Renovation',
    'nav.sobre': 'About',
    'nav.contactos': 'Contact',
    'nav.enviarMensagem': 'Send a message',
    'nav.abrirMenu': 'Open menu',
    'nav.fecharMenu': 'Close menu',
    'nav.saltarConteudo': 'Skip to content',
    'nav.paginaInicial': 'AMA, home',
    'nav.trocarLingua': 'Switch language',

    'site.tituloBase':
      'AMA André Melissa Architects · Architecture studio, Viana do Castelo',
    'site.descricaoBase':
      'Architecture studio in Viana do Castelo. Housing, interiors and space reconversion. Renovations and façade treatment with in-house team.',

    'sobre.titulo': 'About',
    'sobre.tituloPagina': 'About · AMA André Melissa Architects',
    'sobre.paragrafo1':
      'AMA is an architecture studio founded in 2022 by André Machado and Melissa Fazendeiro, in Viana do Castelo. We develop housing, renovation, interior and space reconversion projects. On renovation works — from building façade treatment to condominium interventions — we build with our in-house construction team.',
    'sobre.assinatura':
      'A good project comes from the meeting of place, project and client.',
    'sobre.paragrafo2':
      'The rest is rigour, transparency and quality without compromise.',
    'sobre.fotoAlt': 'André Machado and Melissa Fazendeiro, AMA founders',
    'sobre.fotoLegenda': 'André Machado · Melissa Fazendeiro',

    'reabilitacao.titulo': 'Renovation',
    'reabilitacao.tituloPagina': 'Renovation · AMA André Melissa Architects',
    'reabilitacao.descricao':
      'Façades, condominiums and renovations executed by the studio’s in-house construction team. Before and after record.',
    'reabilitacao.intro':
      'Façades, condominiums and renovations executed by the studio’s in-house construction team. Whoever designs it builds it.',
    'reabilitacao.antes': 'Before',
    'reabilitacao.depois': 'After',

    'contactos.titulo': 'Contact',
    'contactos.tituloPagina': 'Contact · AMA André Melissa Architects',
    'contactos.morada': 'Address',
    'contactos.telefone': 'Phone',
    'contactos.email': 'E-mail',
    'contactos.instagram': 'Instagram',
    'contactos.form.nome': 'Name',
    'contactos.form.contacto': 'Phone or e-mail',
    'contactos.form.tipo': 'Type',
    'contactos.form.tipo.arquitetura': 'Architecture project',
    'contactos.form.tipo.reabilitacao': 'Renovation',
    'contactos.form.tipo.ambos': 'Both',
    'contactos.form.localizacao': 'Location',
    'contactos.form.mensagem': 'Message',
    'contactos.form.enviar': 'Send message',
    'contactos.form.prazo': 'We reply within 24 to 48 working hours.',
    'contactos.form.honeypot': 'Do not fill',
    'contactos.form.sucesso': 'Message received. We reply within 24 to 48 working hours.',
    'contactos.form.novo': 'Send another message',
    'contactos.erro.nome': 'Enter your name.',
    'contactos.erro.contacto': 'Enter a contact.',
    'contactos.erro.localizacao': 'Enter the location.',
    'contactos.erro.mensagem': 'Write a message.',
    'contactos.erro.envio':
      'Could not send now. Please contact us by email or phone.',

    'projeto.tipologia': 'Typology',
    'projeto.local': 'Location',
    'projeto.area': 'Area',
    'projeto.ano': 'Year',
    'projeto.anterior': 'Previous',
    'projeto.seguinte': 'Next',
    'projeto.outrosProjetos': 'Other projects',
    'projeto.imagemN': 'image',

    'rodape.morada': 'Address',
    'rodape.contactos': 'Contact',
    'rodape.navegacao': 'Navigation',
    'rodape.ama': 'AMA',
    'rodape.bio':
      'Architecture studio in Viana do Castelo. Housing, interiors and space reconversion. Renovations and façade treatment with in-house team. A single point of contact, from design to build.',
    'rodape.copyright': '© {ano} AMA André Melissa Architects',
    'rodape.coords': '41.6448° N, 8.8236° W · Praia da Amorosa',
    'rodape.crafted': 'crafted by pereiragabriel',

    '404.titulo': 'Page not found',
    '404.descricao':
      'The page you are looking for does not exist or has been moved. Browse the projects or go back home.',
    '404.voltar': 'Back to home',
  },
  fr: {
    'nav.projetos': 'Projets',
    'nav.reabilitacao': 'Réhabilitation',
    'nav.sobre': 'À propos',
    'nav.contactos': 'Contact',
    'nav.enviarMensagem': 'Envoyer un message',
    'nav.abrirMenu': 'Ouvrir le menu',
    'nav.fecharMenu': 'Fermer le menu',
    'nav.saltarConteudo': 'Aller au contenu',
    'nav.paginaInicial': 'AMA, accueil',
    'nav.trocarLingua': 'Changer de langue',

    'site.tituloBase':
      'AMA André Melissa Architectes · Cabinet d’architecture, Viana do Castelo',
    'site.descricaoBase':
      'Cabinet d’architecture à Viana do Castelo. Habitation, intérieurs et reconversion d’espaces. Réhabilitations et traitement de façades avec équipe propre.',

    'sobre.titulo': 'À propos',
    'sobre.tituloPagina': 'À propos · AMA André Melissa Architectes',
    'sobre.paragrafo1':
      'AMA est un cabinet d’architecture fondé en 2022 par André Machado et Melissa Fazendeiro, à Viana do Castelo. Nous développons des projets d’habitation, de réhabilitation, d’intérieurs et de reconversion d’espaces. Pour les travaux de réhabilitation — traitement de façades d’immeubles, interventions en copropriété — nous construisons avec notre équipe de construction propre.',
    'sobre.assinatura':
      'Un bon projet naît de la rencontre entre le lieu, le projet et le client.',
    'sobre.paragrafo2':
      'Le reste, c’est rigueur, transparence et qualité sans concession.',
    'sobre.fotoAlt': 'André Machado et Melissa Fazendeiro, fondateurs d’AMA',
    'sobre.fotoLegenda': 'André Machado · Melissa Fazendeiro',

    'reabilitacao.titulo': 'Réhabilitation',
    'reabilitacao.tituloPagina': 'Réhabilitation · AMA André Melissa Architectes',
    'reabilitacao.descricao':
      'Façades, copropriétés et réhabilitations exécutées par l’équipe de construction propre du cabinet. Registre avant et après.',
    'reabilitacao.intro':
      'Façades, copropriétés et réhabilitations exécutées par l’équipe de construction propre du cabinet. Celui qui dessine, exécute.',
    'reabilitacao.antes': 'Avant',
    'reabilitacao.depois': 'Après',

    'contactos.titulo': 'Contact',
    'contactos.tituloPagina': 'Contact · AMA André Melissa Architectes',
    'contactos.morada': 'Adresse',
    'contactos.telefone': 'Téléphone',
    'contactos.email': 'E-mail',
    'contactos.instagram': 'Instagram',
    'contactos.form.nome': 'Nom',
    'contactos.form.contacto': 'Téléphone ou e-mail',
    'contactos.form.tipo': 'Type',
    'contactos.form.tipo.arquitetura': 'Projet d’architecture',
    'contactos.form.tipo.reabilitacao': 'Réhabilitation',
    'contactos.form.tipo.ambos': 'Les deux',
    'contactos.form.localizacao': 'Localisation',
    'contactos.form.mensagem': 'Message',
    'contactos.form.enviar': 'Envoyer le message',
    'contactos.form.prazo': 'Nous répondons sous 24 à 48 heures ouvrées.',
    'contactos.form.honeypot': 'Ne pas remplir',
    'contactos.form.sucesso':
      'Message reçu. Nous répondons sous 24 à 48 heures ouvrées.',
    'contactos.form.novo': 'Envoyer un autre message',
    'contactos.erro.nome': 'Indiquez votre nom.',
    'contactos.erro.contacto': 'Indiquez un contact.',
    'contactos.erro.localizacao': 'Indiquez la localisation.',
    'contactos.erro.mensagem': 'Écrivez un message.',
    'contactos.erro.envio':
      'Impossible d’envoyer pour le moment. Contactez-nous par e-mail ou téléphone.',

    'projeto.tipologia': 'Typologie',
    'projeto.local': 'Lieu',
    'projeto.area': 'Surface',
    'projeto.ano': 'Année',
    'projeto.anterior': 'Précédent',
    'projeto.seguinte': 'Suivant',
    'projeto.outrosProjetos': 'Autres projets',
    'projeto.imagemN': 'image',

    'rodape.morada': 'Adresse',
    'rodape.contactos': 'Contact',
    'rodape.navegacao': 'Navigation',
    'rodape.ama': 'AMA',
    'rodape.bio':
      'Cabinet d’architecture à Viana do Castelo. Habitation, intérieurs et reconversion d’espaces. Réhabilitations et traitement de façades avec équipe propre. Un seul interlocuteur, du projet au chantier.',
    'rodape.copyright': '© {ano} AMA André Melissa Architectes',
    'rodape.coords': '41,6448° N, 8,8236° O · Praia da Amorosa',
    'rodape.crafted': 'crafted by pereiragabriel',

    '404.titulo': 'Page introuvable',
    '404.descricao':
      'La page que vous cherchez n’existe pas ou a été déplacée. Parcourez les projets ou revenez à l’accueil.',
    '404.voltar': 'Retour à l’accueil',
  },
};

// Traduz uma chave para o idioma pedido; se faltar a tradução, cai em PT.
export function t(chave: string, locale: Locale | undefined = LOCALE_DEFAULT): string {
  const l: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : LOCALE_DEFAULT;
  return dicionario[l][chave] ?? dicionario[LOCALE_DEFAULT][chave] ?? chave;
}

// Prefixo de URL para o idioma actual (vazio para PT, "/en" e "/fr" para os outros).
export function prefixoLocale(locale: Locale | undefined): string {
  if (locale === 'en') return '/en';
  if (locale === 'fr') return '/fr';
  return '';
}

// Constrói uma ligação interna respeitando o idioma actual.
// Ex.: hrefLocale('/sobre', 'en') → '/en/sobre'.
export function hrefLocale(caminho: string, locale: Locale | undefined): string {
  const p = caminho.startsWith('/') ? caminho : `/${caminho}`;
  if (p === '/') return prefixoLocale(locale) || '/';
  return `${prefixoLocale(locale)}${p}`;
}

// A partir de um pathname arbitrário, extrai o idioma e o caminho neutro.
// Ex.: '/en/sobre' → { locale: 'en', pathSemLocale: '/sobre' }
export function extrairLocale(pathname: string): { locale: Locale; pathSemLocale: string } {
  if (pathname.startsWith('/en')) {
    const resto = pathname.slice(3) || '/';
    return { locale: 'en', pathSemLocale: resto.startsWith('/') ? resto : `/${resto}` };
  }
  if (pathname.startsWith('/fr')) {
    const resto = pathname.slice(3) || '/';
    return { locale: 'fr', pathSemLocale: resto.startsWith('/') ? resto : `/${resto}` };
  }
  return { locale: 'pt', pathSemLocale: pathname };
}

// Campo traduzido: pode ser uma string (PT legado) ou um objecto { pt, en, fr }.
export type CampoTraduzido = string | Partial<Record<Locale, string>>;

// Lê o valor traduzido com fallback: locale escolhido → PT → primeira não vazia → ''
export function traduzir(campo: CampoTraduzido | undefined, locale: Locale | undefined): string {
  if (campo == null) return '';
  if (typeof campo === 'string') return campo;
  const l: Locale = LOCALES.includes(locale as Locale) ? (locale as Locale) : LOCALE_DEFAULT;
  return (
    campo[l] ??
    campo.pt ??
    campo.en ??
    campo.fr ??
    ''
  );
}

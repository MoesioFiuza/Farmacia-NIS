# Segurança e privacidade

Este repositório contém uma base técnica para um sistema clínico. Ele não deve
ser considerado automaticamente adequado à LGPD ou liberado para dados reais
sem avaliação institucional.

## Requisitos antes do uso real

- Utilizar HTTPS em todos os ambientes que trafeguem dados de pacientes.
- Manter PostgreSQL em rede privada, com criptografia de disco e backups
  criptografados.
- Definir formalmente controlador, operador, encarregado e bases legais.
- Aplicar retenção e descarte de dados conforme política aprovada pela
  instituição.
- Criar contas individuais; nunca compartilhar senhas entre profissionais.
- Revisar os eventos de auditoria e testar restauração de backups.
- Fazer análise de risco, teste de invasão e revisão clínica dos formulários.
- Assinar contratos e termos necessários com o provedor de nuvem.

## Dados offline

O modo offline armazena dados no navegador do computador usado no atendimento.
Por isso, computadores clínicos devem ter criptografia de disco, usuário
individual do sistema operacional, bloqueio automático de tela e política de
limpeza em caso de perda ou substituição.

Uma sessão nova exige conexão com o servidor. A aplicação não guarda senha nem
token de acesso permanente no armazenamento JavaScript.

## Comunicação de vulnerabilidades

Não registre dados de pacientes em issues, capturas de tela, mensagens de erro
ou logs. Vulnerabilidades devem ser comunicadas diretamente ao responsável
técnico designado pela instituição.

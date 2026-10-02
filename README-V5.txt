QUEM É O ESPIÃO? — V5 ONLINE

TESTE LOCAL
1. npm install
2. npm start
3. Abra http://localhost:3000

PUBLICAÇÃO HTTPS (exemplo: Render)
1. Envie esta pasta para um repositório Git.
2. Crie um Web Service Node.
3. Build command: npm install
4. Start command: npm start
5. O servidor usa automaticamente a variável PORT da hospedagem.
6. Abra o endereço HTTPS gerado e permita o microfone.

RECURSOS
- Perfil com nome e foto.
- Salas e código de entrada.
- Palavra secreta; o espião recebe palavra semelhante e não é avisado.
- Votação com status VOTOU e contador.
- Avanço da votação somente pelo anfitrião.
- Defesa individual.
- Votação final e revelação controlada pelo anfitrião.
- WebRTC de voz entre navegadores.
- Anel luminoso ao detectar voz.
- Microfone bloqueado automaticamente nas fases de votação.
- Durante defesa, somente o acusado transmite áudio.

REDE / VOZ
A V5 usa STUN público para conexões WebRTC. Isso funciona em muitas redes domésticas e móveis.
Algumas operadoras, Wi-Fi corporativos ou NATs restritivos exigem um servidor TURN.
Para uma versão pública confiável, configure TURN antes do lançamento para muitos usuários.

SEGURANÇA
A palavra e a identidade do espião ficam no servidor e cada jogador recebe apenas sua própria palavra.

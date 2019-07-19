# Fabric setup script

On a fresh Ubuntu 16.04 / 18.04 installation run:

`sudo ./install-dependencies.sh`

`sudo ./setup-fabric-geodb.sh`

# FAQ

Q: Do I need to run fabric-environment.sh ?
A: No, the contents of this file are copied into /etc/bash.bashrc to globally add environment variables to all the users of the OS

Q: Do I have to download the entire repository?
A: No, just download this folder and run the scripts (you may need to chmod +x the install-dependencies.sh and setup-fabric-geodb.sh). The scripts link to the repository and will download everything yoy need.

Q: Where is the repository downloaded?
A: The repository gets downloades to the $HOME directory of the user that has run the scripts. Take into account that for a normal user running the scripts with sudo, the$HOME variable will be set to /home/<user>, while if the user has done sudo su and is running the scripts from root, the \$HOME variable will be /root.

# TODOs

- [ ] Error proof the scripts
- [ ] Additional documentation
- [x] Add root check for setup-fabric-geodb.sh
- [x] Add a FAQ

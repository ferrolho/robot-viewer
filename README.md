# Robot Viewer

> An experimental online robot viewer.

`Figure 1 - The application as is on startup.`
![fig1](screenshots/gui.png)

`Figure 2 - Axis, Grid, Shadows, and Stats options active.`
![fig2](screenshots/axis-grid-shadows-stats.png)

`Figure 3 - Using Inverse Kinematics to position the KUKA LBR iiwa robot.`
![fig3](screenshots/ik.png)

`Figure 4 - The reachability of the NASA Valkyrie humanoid robot with 44 degrees of freedom.`
![fig4](screenshots/valkyrie.png)

## Working features yet to be added to the GUI

#### Concerning robot motion:

- <kbd>H</kbd> - Moves the robot from its current configuration to the 'home' configuration;
- <kbd>K</kbd> - Prints the robot's current configuration to the console;
- <kbd>P</kbd> - Moves the robot from its current configuration to a random configuration.

#### Concerning the 'target' widget / gizmo:

- <kbd>R</kbd> - Switches to *orientation* mode;
- <kbd>T</kbd> - Switches to *translation* mode.


## Limitations

#### Inverse Kinematics

- The `IK` feature only works for robots with up to 6 degrees of freedom, and *orientation* is not properly implemented;

- The `Genetic Algorighm` feature is not optimal, slow, and causes the interface to lag;

- The `Pseudo Inverse` is the best implemented `IK` solution in this viewer.

    ![Pseudo Inverse](https://latex.codecogs.com/gif.download?J%5E%7B%5C%23%7D%20%3D%20W%5E%7B-1%7D%20J%5E%5Ctop%20%28%20J%20W%5E%7B-1%7D%20J%5E%5Ctop%20+%20C%20%29%5E%7B-1%7D)

#### Robot Models

- Clearpath's `Dual Arm Husky` has a broken kinematics tree, and as such will not move;

- Some models have broken materials, and all models only work with flat shading. This is not an issue with Three.js, but with ROS `collada_urdf urdf_to_collada` command line utility (cf. https://github.com/ros/collada_urdf/issues/18).

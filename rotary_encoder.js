/* This reads a rotary encoder with node.js
   The idea for the logic came from
	 https://www.youtube.com/watch?v=hFpSwfKw5G0
*/
var Gpio = require('onoff').Gpio
   ,re_switch_a = new Gpio(23, 'in', 'both') //Rotary Encoder Switch a
   ,re_switch_b = new Gpio(24, 'in', 'both') //Rotary Encoder Switch b
   ,a_val = 0 //a value GPIO 17
   ,b_val = 0 //b value GPIO 18
	 ,val = 0 //value to increment/decrement

function exit() {
  re_switch_a.unexport();
  process.exit();
}

console.log(val);
//Watch for hardware interrupt of switch 1
re_switch_a.watch(function (err, value) {
  if (err) {
    throw err;
  }
  a_val = value;	
});

//Watch for hardware interrupt of switch 2
re_switch_b.watch(function (err, value) {
  if (err) {
    throw err;
  }
	b_val = value;

	//only evaluate if a_val = 1
	if (a_val == 1 && b_val == 1) {
	  console.log(val++);
	} else if (a_val==1 && b_val==0) {
		console.log(val--);
	}
});

process.on('SIGINT', exit);



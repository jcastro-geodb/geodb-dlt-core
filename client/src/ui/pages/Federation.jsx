import React from "react";
import Button from "react-bootstrap/Button";

class Federation extends React.Component {
  constructor(props) {
    super(props);
    this.state = { db: props.db };
  }

  insert = () => {
    const { db } = this.state;

    var doc = {
      hello: "world",
      n: 5,
      today: new Date(),
      nedbIsAwesome: true,
      notthere: null,
      notToBeSaved: undefined, // Will not be saved
      fruits: ["apple", "orange", "pear"],
      infos: { name: "nedb" }
    };

    db.insert(doc, function(err, newDoc) {
      // Callback is optional
      if (err) console.error(err);
      else console.log("ok");
    });
  };

  log = () => {
    const { db } = this.state;

    console.log(db);

    db.find({ hello: "world" }, (err, docs) => {
      if (err) console.error(err);
      else console.log(docs);
    });
  };

  componentDidMount() {}

  render() {
    return (
      <div>
        <Button onClick={this.insert}>Insert</Button>
        <Button onClick={this.log}>Log</Button>
      </div>
    );
  }
}
export default Federation;
